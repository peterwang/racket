#lang racket/base
(require compiler/cm
         setup/getinfo
         syntax/modread
         racket/match
         racket/file)

(provide generate-stripped-directory
         fixup-local-redirect-reference)

(define (generate-stripped-directory binary? dir dest-dir)
  (define drop-keep-ns (make-base-namespace))
  (define (add-drop+keeps dir base drops keeps)
    (define get-info (get-info/full dir #:namespace drop-keep-ns))
    (define drop-tag (if binary? 'binary-omit-files 'source-omit-files))
    (define more-drops (if get-info
                           (get-info drop-tag (lambda () null))
                           null))
    (define keep-tag (if binary? 'binary-keep-files 'source-keep-files))
    (define more-keeps (if get-info
                           (get-info keep-tag (lambda () null))
                           null))
    (define (check tag l)
      (unless (and (list? l) (andmap (lambda (p)
                                       (and (path-string? p)
                                            (relative-path? p)))
                                     l))
        (error 'strip "bad ~a value from \"info.rkt\": ~e" tag l)))
    (check drop-tag more-drops)
    (check keep-tag more-keeps)

    (define (add ht l)
      (for/fold ([ht ht]) ([i (in-list l)])
        (hash-set ht 
                  (if (eq? base 'same)
                      (if (path? i) i (string->path i))
                      (build-path base i))
                  #t)))
    (values (add drops more-drops)
            (add keeps more-keeps)))
  
  (define (drop-by-default? path get-p)
    (define bstr (path->bytes path))
    (or (regexp-match? #rx#"^(?:[.]git.*|[.]svn)$"
                       bstr)
        (regexp-match? (if binary?
                           #rx#"^(?:[.]git.*|[.]svn|tests|scribblings|.*[.]scrbl)$"
                           #rx#"^(?:compiled|doc)$")
                       bstr)
        (and binary?
             (regexp-match? #rx"[.](?:ss|rkt)$" bstr)
             (not (equal? #"info.rkt" bstr))
             (file-exists? (let-values ([(base name dir?) (split-path (get-p))])
                             (build-path base "compiled" (path-add-suffix name #".zo")))))
        (and binary?
             (or (equal? #"info_rkt.zo" bstr)
                 (equal? #"info_rkt.dep" bstr)))))

  (define (fixup new-p path)
    (when binary?
      (define bstr (path->bytes path))
      (cond
       [(regexp-match? #rx"[.]html$" bstr)
        (fixup-html new-p)]
       [(equal? #"info.rkt" bstr)
        (fixup-info new-p)]
       [else (void)])))
  
  (define (explore base paths drops keeps)
    (for ([path (in-list paths)])
      (define p (if (eq? base 'same)
                    path
                    (build-path base path)))
      (when (and (not (hash-ref drops p #f))
                 (or (hash-ref keeps p #f)
                     (not (drop-by-default? 
                           path
                           (lambda () (build-path dir p))))))
        (define old-p (build-path dir p))
        (define new-p (build-path dest-dir p))
        (cond
         [(file-exists? old-p)
          (copy-file old-p new-p)
          (fixup new-p path)]
         [(directory-exists? old-p)
          (define-values (new-drops new-keeps)
            (add-drop+keeps old-p p drops keeps))
          (make-directory new-p)
          (explore p
                   (directory-list old-p)
                   new-drops
                   new-keeps)]
         [else (error 'strip "file or directory disappeared?")]))))

  (define-values (drops keeps)
    (add-drop+keeps dir 'same #hash() #hash()))
  
  (explore 'same (directory-list dir) drops keeps))

(define (fixup-html new-p)
  ;; strip full path to "local-redirect.js"
  (fixup-local-redirect-reference new-p ".."))

(define (fixup-local-redirect-reference p js-path)
  ;; Relying on this HTML pattern (as generated by Scribble's HTML
  ;; renderer) is a little fragile. Any better idea?
  (define rx #rx"<script type=\"text/javascript\" src=\"([^\"]*)/local-redirect.js\">")
  (define m (call-with-input-file*
             p
             (lambda (i) (regexp-match-positions rx i))))
  (when m
    (define start (caadr m))
    (define end (cdadr m))
    (define bstr (file->bytes p))
    (define new-bstr
      (bytes-append (subbytes bstr 0 start)
                    (string->bytes/utf-8 js-path)
                    (subbytes bstr end)))
    (call-with-output-file* 
     p
     #:exists 'truncate/replace
     (lambda (out) (write-bytes new-bstr out)))))

(define (fixup-info new-p)
  (define dir (let-values ([(base name dir?) (split-path new-p)])
                base))
  ;; check format:
  (define get-info
    (get-info/full dir #:namespace (make-base-namespace)))
  (when get-info
    ;; read in:
    (define content
      (call-with-input-file* 
       new-p
       (lambda (in)
         (begin0 
          (with-module-reading-parameterization
           (lambda () (read in)))))))
    ;; convert:
    (define new-content
      (match content
        [`(module info setup/infotab (#%module-begin . ,defns))
         `(module info setup/infotab
            (#%module-begin
             (define assume-virtual-sources '())
             . ,(filter values
                        (map (fixup-info-definition get-info) defns))))]))
    ;; write updated:
    (call-with-output-file* 
     new-p
     #:exists 'truncate
     (lambda (out)
       (write new-content out)
       (newline out)))
    ;; sanity check:
    (unless (get-info/full dir #:namespace (make-base-namespace))
      (error 'pkg-binary-create "rewrite failed"))
    ;; compile it:
    (managed-compile-zo new-p)))


(define ((fixup-info-definition get-info) defn)
  (match defn
    [`(define build-deps . ,v) #f]
    [`(define scribblings . ,v)
     `(define rendered-scribblings . ,v)]
    [`(define copy-foreign-libs . ,v)
     `(define move-foreign-libs . ,v)]
    [`(define copy-man-pages . ,v)
     `(define move-man-pages . ,v)]
    [_ defn]))