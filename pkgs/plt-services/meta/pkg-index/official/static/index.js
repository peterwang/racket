// xxx change this once the new dns entries are in
//var dynamic_host = "pkgd.racket-lang.org";
//var dynamic_port = 443;
var dynamic_host = "plt-etc.byu.edu";
var dynamic_port = 9004;

function dynamic_url ( u ) {
    return "https://" + dynamic_host + ":" + dynamic_port + u + "?callback=?"; }

function me () {
    return localStorage['email']; }

$( document ).ready(function() {
    function jslink ( texts, clickf) {
        return $('<a>', { href: "javascript:void(0)",
                          click: clickf } ).html(texts); }

    function dynamic_send ( u, o ) {
        o['email'] = localStorage['email'];
        o['passwd'] = localStorage['passwd'];
        $.getJSON( dynamic_url(u), o, function (r) { return; } ); }

    function dynamic_pkgsend ( u, o ) {
        o['pkg'] = active_info['name'];
        dynamic_send ( u, o ); }

    $("#package_info").dialog({
        autoOpen: false,
        minWidth: 600,
        minHeight: 600,
        position: { my: "center", at: "center", of: "#search_menu" },
        modal: true });

    function format_time( t ) {
        var d = new Date( t * 1000 );
        return d.toLocaleString(); }

    var active_info = false;
    var target_pkg = false;
    function update_info( pkgi ) {
        // console.log( pkgi );
        change_hash( "[" + pkgi['name'] + "]" );

        var mypkg_p = ($.inArray(me(), pkgi['authors'] ) != -1);

        function make_editbutton ( spot, initv, fun ) {
            if ( mypkg_p ) {
                $( "#" + spot ).append( $('<button>')
                                        .button({ icons: { primary: "ui-icon-pencil" } })
                                        .click( function (e) {
                                            $( "#" + spot ).html("").append(
                                                $('<input id="' + spot + '_text" type="text" class="text ui-widget-content ui-corner-all">') );
                                            var it = $( "#" + spot + "_text" );
                                            it.keypress( function (e) {
                                                if (e.which == 13) { fun (it.val()); } } );
                                            it.val(initv).focus(); } ) ); } }

        $( "#pi_name" ).text( pkgi['name'] );
        make_editbutton ( "pi_name", pkgi['name'], submit_mod_name );

        $( "#pi_name_inst" ).text( pkgi['name'] );
        $( "#pi_ring" ).text( pkgi['ring'] );
        $( "#pi_authors" ).html("")
            .append( $.map( pkgi['authors'],
                            function ( author, i ) {
                                if ( mypkg_p && author != me() ) {
                                    return [ author, jslink( "[x]", function () { submit_remove_author(author); }),
                                             " "]; }
                                else {
                                    return [author, " "]; }} ) );
        if ( mypkg_p ) {
            $( "#pi_add_author_row" ).show(); }
        else {
            $( "#pi_add_author_row" ).hide(); }

        $( "#pi_source" ).html( $('<a>', { text: pkgi['source'],
                                           href: pkgi['source_url']  } ));
        make_editbutton ( "pi_source", pkgi['source'], submit_mod_source );

        $( "#pi_checksum" ).text( pkgi['checksum'] );
        $( "#pi_last_updated" ).text( format_time(pkgi['last-updated']) );
        $( "#pi_last_checked" ).text( format_time(pkgi['last-checked']) );
        $( "#pi_last_edit" ).text( format_time(pkgi['last-edit']) );

        $( "#pi_description" ).text( pkgi['description'] );
        make_editbutton ( "pi_description", pkgi['description'], submit_mod_description );

        ($( "#pi_tags" ).html("").append( $.map( pkgi['tags'], function ( tag, i ) {
            if ( mypkg_p ) {
                return [ tag, jslink( "[x]", function () { submit_remove_tag(tag); }),
                         " "]; }
            else {
                return [tag, " "]; } } ) ));

        $( "#pi_versions" ).html("").append( $.map( pkgi['versions'], function ( vo, v ) {
            return [ $('<tr>').append( $('<td>').html("").append(
                v, (mypkg_p ? ["&nbsp;", jslink( "[x]", function () { submit_remove_version(v); }) ] : "") ),
                                       $('<td>').html(vo['source']) ),
                     $('<tr>').append( $('<td>').html(""),
                                       $('<td>').html(vo['checksum']) ),
                     " "]; } ) );
        if ( mypkg_p ) {
            $( "#pi_add_version_row" ).show(); }
        else {
            $( "#pi_add_version_row" ).hide(); }

        active_info = pkgi; };

    function submit_remove_tag ( tag ) {
        dynamic_pkgsend( "/jsonp/package/tag/del", { tag: tag } );

        var tag_index = $.inArray(tag, active_info['tags']);
        active_info['tags'].splice( tag_index, 1 );
        delete active_info['search-terms'][ tag ];
        evaluate_search();

        update_info( active_info ); }
    function submit_add_tag () {
        var it = $( "#pi_add_tag_text" );
        var tag = it.val();
        it.val("");

        dynamic_pkgsend( "/jsonp/package/tag/add", { tag: tag } );

        active_info['tags'].push( tag );
        active_info['search-terms'][ tag ] = true;
        evaluate_search();

        update_info( active_info ); }
    $( "#pi_add_tag_text" ).keypress( function (e) {
        if (e.which == 13) { submit_add_tag (); } } );
    $( "#pi_add_tag_button" ).click( function (e) { submit_add_tag (); } );

    function submit_remove_author ( author ) {
        dynamic_pkgsend( "/jsonp/package/author/del", { author: author } );

        var author_index = $.inArray(author, active_info['authors']);
        active_info['authors'].splice( author_index, 1 );
        delete active_info['search-terms'][ "author:" + author ];
        evaluate_search();

        update_info( active_info ); }
    function submit_add_author () {
        var it = $( "#pi_add_author_text" );
        var author = it.val();
        it.val("");

        dynamic_pkgsend( "/jsonp/package/author/add", { author: author } );

        active_info['authors'].push( author );
        active_info['search-terms'][ "author:" + author ] = true;
        evaluate_search();

        update_info( active_info ); }
    $( "#pi_add_author_text" ).keypress( function (e) {
        if (e.which == 13) { submit_add_author (); } } );
    $( "#pi_add_author_button" ).click( function (e) { submit_add_author (); } );

    function submit_remove_version ( version ) {
        dynamic_pkgsend( "/jsonp/package/version/del", { version: version } );

        delete active_info['versions'][version];

        update_info( active_info ); }
    function submit_add_version () {
        var it = $( "#pi_add_version_text" );
        var version = it.val();
        it.val("");
        it = $( "#pi_add_version_source_text" );
        var source = it.val();
        it.val("");

        dynamic_pkgsend( "/jsonp/package/version/add", { version: version, source: source } );

        active_info['versions'][version] = { source: source, checksum: "" };

        update_info( active_info ); }
    $( "#pi_add_version_source_text" ).keypress( function (e) {
        if (e.which == 13) { submit_add_version (); } } );
    $( "#pi_add_version_button" ).click( function (e) { submit_add_version (); } );

    function submit_mod ( new_name, new_description, new_source ) {
        dynamic_pkgsend( "/jsonp/package/modify",
                         { name: new_name,
                           description: new_description,
                           source: new_source } );

        active_info['name'] = new_name;
        active_info['description'] = new_description;
        active_info['source'] = new_source;

        update_info( active_info ); }
    function submit_mod_name ( newv ) {
        submit_mod ( newv, active_info['description'], active_info['source'] ); }
    function submit_mod_description ( newv ) {
        submit_mod ( active_info['name'], newv, active_info['source'] ); }
    function submit_mod_source ( newv ) {
        submit_mod ( active_info['name'], active_info['description'], newv ); }

    var search_terms = { };

    function clear_terms () {
        $.each(search_terms,
               function ( term, termv ) {
                   delete search_terms[term];} ); }

    function parse_hash ( h ) {
        while ( h != "" ) {
            if ( h.charAt(0) == "(" ) {
                var end = 1;
                while ( h.charAt(end) != ")" ) {
                    end++;
                    if ( ! h.charAt(end) ) { break; } }
                search_terms[ h.substring(1, end) ] = true;
                h = h.substring(end+1); }
            else if ( h.charAt(0) == "[" ) {
                target_pkg = h.substring(1, h.length - 1 );
                h = ""; }
            else {
                h = ""; } } }

    { var h = window.location.hash;
      if ( h == "" ) {
          search_terms["!main-tests"] = true;
          search_terms["!main-distribution"] = true; }
      else {
          h = h.substring(1);
          parse_hash(h); } }

    var expected_hash = "";
    function change_hash ( v ) {
        expected_hash = v;
        window.location.hash = v; }

    $(window).bind( 'hashchange', function(e) {
        var actual_hash = window.location.hash;
        if ( expected_hash != actual_hash ) {
            // TODO Do something here. It is hard to do the right
            // thing, particularly with the Back button because we
            // don't add the tags in the same order the user add them
            // in. We could do that though.
            // console.log("hash changed beneath me!");
            return 42; } });

    function filterlink ( text, tclass, f ) {
        return [ jslink(text, f).addClass(tclass), " " ]; };

    function addfilterlink ( text, term, tclass ) {
        return filterlink( text, tclass, function () {
            search_terms[term] = true;
            evaluate_search(); } ); };
    function removefilterlink ( text, term, tclass ) {
        return filterlink( text, tclass, function () {
            delete search_terms[term];
            evaluate_search(); } ); };
    function changefilterlink ( text, term, nterm, tclass ) {
        return filterlink( text, tclass, function () {
            delete search_terms[term];
            search_terms["!" + term] = true;
            evaluate_search(); } ); };

    function evaluate_search () {
        var shown_terms = {};

        $.each( $('#packages_table tr'), function (key, dom) {
            var value = $(dom).data("obj");
            var show = true;
            var vterms = value['search-terms'];

            $.each(search_terms,
                   function ( term, termv ) {
                       if ( term.charAt(0) == "!" ) {
                           if ( vterms[term.substring(1)] ) {
                               show = false; } }
                       else {
                           if ( ! vterms[term] ) {
                               show = false; } } });

            if ( show ) {
                $(dom).show();

                $.each(vterms, function ( term, termv ) {
                    if ( term.substring(0,7) != "author:") { shown_terms[term]++; } }); }
            else {
                $(dom).hide();

                $.each(vterms, function ( term, termv ) {
                    if ( term.substring(0,7) != "author:") {
                        if ( ! shown_terms[term] ) { shown_terms[term] = 0; } } });} });

        $.each(search_terms,
               function ( term, termv ) {
                   if ( term.charAt(0) == "!" ) {
                       shown_terms[ term.substring(1) ] = -2; }
                   else {
                       shown_terms[ term ] = -1; } });

        var shown_terms_keys = object_keys(shown_terms);
        var shown_terms_skeys = shown_terms_keys.sort(function(a,b) {
            return ((a < b) ? -1 : ((a > b) ? 1 : 0)); });

        change_hash( "" );
        $("#search_menu").html("").append( $.map( shown_terms_skeys, function ( term, i ) {
            if ( shown_terms[term] < 0 ) {
                if ( shown_terms[term] == -1 ) {
                    change_hash( window.location.hash + "(" + term + ")" );
                    return changefilterlink ( term, term, "!" + term, "active" ); }
                else {
                    change_hash( window.location.hash + "(" + "!" + term + ")" );
                    return removefilterlink ( term, "!" + term, "inactive" ); } }
            else if ( shown_terms[term] == 0 ) {
                return [ term, " " ]; }
            else {
                return addfilterlink ( term, term, "possible" ); } } ) );

        $("#packages_table tr:visible:even").removeClass("even");
        $("#packages_table tr:visible:odd").addClass("even"); };

    function object_keys ( o ) {
        var names = [];
        $.each(o, function(key, value) { names.push(key) });
        return names; }

    function open_info ( i ) {
        update_info( i );
        $( "#package_info" ).dialog( "open" ); }

    function curate_link ( curate_span, down_p, value ) {
        var dr = (down_p ? -1 : +1);
        var old_ring = value['ring'];
        var new_ring = Math.min(Math.max(0, old_ring + dr), 2);
        if ( new_ring == old_ring ) {
            return ""; }
        else {
            return jslink((down_p ? "&blacktriangledown;" : "&blacktriangle;"),
                          function () {
                              dynamic_send ( "/jsonp/package/curate",
                                             { pkg: value['name'],
                                               ring: new_ring } );
                              value['ring'] = new_ring;
                              delete value['search-terms']["ring:" + old_ring];
                              value['search-terms']["ring:" + new_ring] = true;
                              evaluate_search();
                              update_curate_span (curate_span, value); }); } }

    function update_curate_span (curate_span, value) {
        curate_span.html("").
            append(curate_link ( curate_span, true, value ),
                   value['ring'],
                   curate_link ( curate_span, false, value ),
                   "&nbsp;"); }

    var now = new Date().getTime() / 1000;
    function add_package_to_list ( value ) {
        var curate_span = $('<span>', { class: "curate_link" } ).hide();
        update_curate_span (curate_span, value);

        $('<tr>',
          { class: ((now - (60*60*24*2)) < value['last-updated'] ? "recent" : "old") })
            .data( "obj", value)
            .append(
                $('<td>').html("")
                    .append( curate_span,
                             jslink( value['name'], function () { open_info ( value ); }) ),
                $('<td>').append( $.map( value['authors'], function ( author, i ) {
                    return addfilterlink ( author, "author:" + author, "possible" ); } ) ),
                $('<td>').text( value['description'] ),
                $('<td>').append( $.map( value['tags'], function ( tag, i ) {
                    return addfilterlink ( tag, tag, "possible" ); } ) ))
            .appendTo('#packages_table'); }

    $.getJSON( "/pkgs-all.json", function( resp ) {
        var names = object_keys(resp);
        var snames = names.sort(function(a,b) {
            return ((a < b) ? -1 : ((a > b) ? 1 : 0)); })

        $.each( snames, function (name_i) {
            var name = snames[name_i];
            add_package_to_list ( resp[name] ); });

        evaluate_search();

        if ( target_pkg && resp[target_pkg] ) {
            open_info ( resp[target_pkg] ) } });

    $("#login").dialog({
        autoOpen: false,
        minWidth: 600,
        minHeight: 600,
        position: { my: "center", at: "center", of: "#search_menu" },
        modal: true });

    var saved_password = false;
    function login_submit () {
        $( "#login_error" ).html( "" );

        var et = $( "#login_email_text" );
        var pt = $( "#login_passwd_text" );

        var e = et.val();
        var p;
        var c;
        if ( saved_password ) {
            p = saved_password;
            c = pt.val(); }
        else {
            p = pt.val();
            c = ""; }

        $.getJSON( dynamic_url("/jsonp/authenticate"),
                   { email: e, passwd: p, code: c },
                   function( resp ) {
                       if ( resp == "emailed" ) {
                           saved_password = p;
                           $( "#login_passwd_label" ).html( "Code:" );
                           pt.val("");
                           $( "#login_error" ).html( "Check your email for an email code." ); }
                       else if ( resp == "wrong-code" ) {
                           pt.val("");
                           $( "#login_error" ).html( "That is the incorrect code." ); }
                       else if ( resp ) {
                           $( "#login_passwd_label" ).html( "Password:" );

                           et.val("");
                           pt.val("");

                           localStorage['email'] = e;
                           localStorage['passwd'] = p;

                           $( "#login" ).dialog( "close" );

                           initial_login(); }
                       else {
                           pt.val("");
                           $( "#login_error" ).html( "Incorrect password, please retry" ); }; } ); }
    $( "#login_passwd_text" ).keypress( function (e) {
        if (e.which == 13) { login_submit (); } } );
    $( "#login_button" ).click( function (e) { login_submit (); } );

    function menu_logout () {
        $("#logout").html( jslink( "login", function () { $( "#login" ).dialog( "open" ); } ) ); }
    function menu_loggedin ( curate_p ) {
        $("#logout").html("")
            .append( me(),
                     ( curate_p ? [ " (", jslink( "curator", function () {
                         $( "span.curate_link" ).show();
                         clear_terms();
                         search_terms[ "!:conflicts:" ] = true;
                         search_terms[ "ring:2" ] = true;
                         evaluate_search(); }),
                                    ")" ] : ""),
                     " | ",
                     jslink( "upload", function () {
                         var value = { name: "",
                                       author: me(),
                                       authors: [ me() ],
                                       'checksum-error': false,
                                       conficts: [],
                                       dependencies: [],
                                       description: "",
                                       'last-checked': now,
                                       'last-edit': now,
                                       'last-updated': now,
                                       modules: [],
                                       ring: 2,
                                       source: "",
                                       'source_url': "",
                                       tags: [],
                                       versions: []};
                         value['search-terms'] = {};
                         value['search-terms'][("author:" + me())] = true;
                         add_package_to_list (value);
                         evaluate_search();
                         open_info(value); }),
                     " | ",
                     jslink( "update", function () {
                         dynamic_send ( "/jsonp/update", {} ); }),
                     " | ",
                     jslink( "logout", function () {
                         localStorage['email'] = "";
                         localStorage['passwd'] = "";

                         menu_logout (); }) ); }

    function initial_login () {
        $.getJSON( dynamic_url("/jsonp/authenticate"),
                   { email: localStorage['email'], passwd: localStorage['passwd'], code: "" },
                   function( resp ) {
                       if ( $.isPlainObject(resp) ) {
                           menu_loggedin( resp['curation'] ); }
                       else {
                           menu_logout();
                           console.log( "login failed" ); } } ); }


    if ( localStorage['email'] && localStorage['passwd'] ) {
        initial_login();
    } else {
        menu_logout (); } });