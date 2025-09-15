
//spreadsheet variables - edit these to point to your spreadsheet
var spreadsheetID = "1KhXNef0QJj48RL1NwmSPaNL9nx0aj_pB10EtzeOZy5w";
var siteSheet ='1569296108';
var pagesSheet = '28080804';
var itemsSheet = '0';

// override source variable - used to select a source spreadsheet from the URL
originalID = spreadsheetID; //store the original ID for later checking
overrideSource = spreadsheetID; //this variable will be overwritten later if there is a source in the URL

//remote variable - change this to run your site on loal json tiles - see Rondo Tools for more information
var remote = true;

//other variables - none of these necessarily need to be changed
var itemsTable;
var homeQuery;
var openPage;
var header = document.title;
var subhead = "";
var queryString;

//select markdown or HTML for page formatting
var markdown = true;
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true
});


//function that runs when the page loads
//Consists of three nested calls to the Google Sheets Visualization API - first for site settings/configuration, then for pages, and last for items.
$(document).ready(function() {



  //get the current from the URL -written to the variable openPage
  getQueries();
  
  //if there is a source specified in the URL, use that instead of the Spreadsheet ID
  spreadsheetID = overrideSource;
  

  //add a listener to capture the back and forward buttons in the browser
  window.addEventListener('popstate', () => {

    getQueries();
    openPageFromQuery()

  });

  //make the Rondo Tools link open the tools modal
  $('.tools').on('click',function(event) {
    event.preventDefault();
    $('.rondo-tools').attr('open', '');
  });

  //basic modal interactions

  $('dialog a.close').on('click', function(){
    $('.item-modal, .rondo-tools').removeAttr('open');
  });
  // Close with Esc key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $('.item-modal, .rondo-tools').removeAttr('open');
    }
  });

  // Close with a click outside
  document.addEventListener("click", (event) => {
    //when clicking outside the modal, the target is the modal. Otherwise the target is a child of the modal - this method doesn't result in bubbling up, so it only closes on a click outside
    if ($(event.target).is('dialog')) {
        $('.item-modal, .rondo-tools').removeAttr('open');
      }
  });

  //if the site is set to run remote, go to Google Sheets - if not, run locally from the json folder
  if (remote) {

  //load data from Google Sheet using Visualization API - this starts the three nested calls
  google.charts.load('current', {
    packages: ['corechart']
  }).then(function () {

    //first we query the Site sheet for basic site information
    var query = new google.visualization.Query('https://docs.google.com/spreadsheets/d/'+spreadsheetID+'/gviz/tq?gid='+siteSheet+'&headers=1');
    query.send(function (response) {
      if (response.isError()) {
        console.log('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
        return;
      };
      var siteDT = response.getDataTable();
      var siteJsonData = siteDT.toJSON();
      siteJsonData = JSON.parse(siteJsonData);

      //reveal siteConfigData in the Rondo Tools modal, available from the footer. this is primarily for localization of the site/disconnection from Google Sheets, but could also be used for data sharing.
      $('.tools-site').text(JSON.stringify(siteJsonData));

      siteConfig(siteJsonData);

      //end of site configuration

      //second query the pages sheet to get content and build the site menu
      var query = new google.visualization.Query('https://docs.google.com/spreadsheets/d/'+spreadsheetID+'/gviz/tq?gid='+pagesSheet+'&headers=1');
      query.send(function (response) {
        if (response.isError()) {
          console.log('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
          return;
        };
      //write to JSON
      var pagesDT = response.getDataTable();
      var pagesJsonData = pagesDT.toJSON();
      pagesJsonData = JSON.parse(pagesJsonData);

      //write pagesJSONData to Rondo tools
      $('.tools-pages').text(JSON.stringify(pagesJsonData));

      pages(pagesJsonData);

      //end of pages

      //Query items sheet for collection items
      var query = new google.visualization.Query('https://docs.google.com/spreadsheets/d/'+spreadsheetID+'/gviz/tq?gid='+itemsSheet+'&headers=1');
      query.send(function (response) {
        if (response.isError()) {
          console.log('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
          return;
        };
        //write to JSON
        var dt = response.getDataTable();
        var itemsJsonData = dt.toJSON();

        itemsJsonData = JSON.parse(itemsJsonData);

        //write jsonData to Rondo Tools
        $('.tools-items').text(JSON.stringify(itemsJsonData));

        itemsDataTable(itemsJsonData);

      //end of datatable configuration

      //end of items data request
      });
      //end of pages data request
      });
    //end of site data request
    });
  //end of google charts API call
  });
  } //end of if remote
  else {
    console.log('Running Rondo Local');
    $.getJSON("json/site.json", function(siteJsonData) {
      siteConfig(siteJsonData);
      $.getJSON("json/pages.json", function(pagesJsonData) {
        pages(pagesJsonData);
        $.getJSON("json/items.json", function(itemsJsonData) {
          itemsDataTable(itemsJsonData);

        });
      });
    });
    //don't display localizing Tools if site is already localized
    $('.localizing').empty().html('<h5>Localizing Tools</h5><p>This Rondo site is currently running on local JSON files.');

  }

//end of document.ready function
});



//functions called in the script

//function to display the current page - called when page is changed via the menu
function pageChange() {
  console.log(originalID)
  console.log(overrideSource)
  //get info needed for the script from the clicked html element
  var query =  $(event.target).attr('pagequery');
  var slug = $(event.target).attr('pageslug');
  var articleTitle = $(event.target).attr('pagetitle');
  var type = $(event.target).attr('pagenavtype');

  //hide all of the articles/pages and then show the selected page
  $('#pages-container article').hide();
  $('article.'+slug).show();

  //create a storedsearch and use the search builder to select only the relevant items
  var storedSearch = { "criteria": [ { "condition": "contains", "data": "Keywords", "type": "string", "value": [ query ] } ], "logic": "AND" }
  itemsTable.search('').searchBuilder.rebuild(storedSearch).draw();
  //change the header in the items section, the page title, and scroll to the article header
  $('.items-head').text(articleTitle + ' - Related Items');
  $('details').removeAttr('open');
  document.title = articleTitle + " - "+header
  $('article.' + slug + ' h2').trigger('focus');
  $('figure.hero').hide();
  $('body').animate(
    {
      scrollTop: $('article.' + slug).offset().top,
    },
    800 //speed
  );
  //update the URL query
  if (spreadsheetID == originalID) {
    window.history.pushState(null, null, '?page='+slug);
  }
  else {
    window.history.pushState(null, null, '?source='+ overrideSource +'&page='+slug);
  }
}
//function to change page by index number - called when using next and previous buttons on articles. largely the same as the function above, but we need to get the information differently
function pageChangeIndex() {
  //get the target from the clicked button, but then get the other information from the targetted page
  var target = $(event.target).attr('targetpage');
  var myArticle = $("article[pageindex='" + target + "']");
  var query = myArticle.attr('pagequery');
  var slug = myArticle.attr('pageslug');
  var articleTitle = myArticle.find('h2').text();
  $('#pages-container article').hide();
  $('article.'+slug).show();
  //from here it is the same as above
  var storedSearch = { "criteria": [ { "condition": "contains", "data": "Keywords", "type": "string", "value": [ query ] } ], "logic": "AND" };
  itemsTable.search('').searchBuilder.rebuild(storedSearch).draw();
  $('.items-head').text(articleTitle + ' - Related Items');
  $('details').removeAttr('open');
  document.title = articleTitle + " - "+header
  $('article.' + slug + ' h2').trigger('focus');
  $('figure.hero').hide();
  $('body').animate(
    {
      scrollTop: $('article.' + slug).offset().top,
    },
    800 //speed
  );
  //update the URL query
  if (spreadsheetID == originalID) {
    window.history.pushState(null, null, '?page='+slug);
  }
  else {
    window.history.pushState(null, null, '?source='+ overrideSource +'&page='+slug);
  }
};

//function to display item in modal popup - runs when user clicks an item. Rowdata is retrieved from the datatables API, meaning it is stored in the table and retrieved for the row that was clicked.
//This section may need to be changed when adding custom metadata fields
function modalBuild(rowData) {
  //change the modal title
  var thisTitle;
  if (rowData.c[0]) {
    thisTitle = rowData.c[0].v;
  }
  else {
    thisTitle = '[Untitled]';
  }
  $('h3#modal-title').empty().text(thisTitle);
  //prep the modal
  $('dd').empty();
  $('dt').show();
  $('.modal-image').empty();
  //rewrite the values - add any custom fields here, and in the HTML
  if (rowData.c[8]) {
    $('figure.modal-image').html('<img src="'+rowData.c[8].v+'" alt="'+thisTitle+'"/>');
  }
  else if (rowData.c[5]) {
      $('figure.modal-image').html('<img src="'+rowData.c[5].v+'" alt="'+thisTitle+'"/>');
  };
  if (rowData.c[1]) {
    $('dd.rowDate').text(rowData.c[1].v);
  };
  if (rowData.c[2]) {
    $('dd.rowCreator').text(rowData.c[2].v);
  };
  if (rowData.c[3]) {
    $('dd.rowDescription').text(rowData.c[3].v);
  };
  if (rowData.c[4]) {
    $('dd.rowProvider').text(rowData.c[4].v);
  };
  if (rowData.c[17]) {
    $('dd.rowCommentary').text(rowData.c[17].v);
  };
  if (rowData.c[10]) {
    $('dd.rowCoverage').text(rowData.c[10].v);
  };
  if (rowData.c[11]) {
    $('dd.rowFormat').text(rowData.c[11].v);
  };
  if (rowData.c[12]) {
    $('dd.rowLanguage').text(rowData.c[12].v);
  };
  if (rowData.c[13]) {
    $('dd.rowRelation').html('<a target="_blank" role="button" href="'+rowData.c[13].v+'">Related Resource</a>');
  };
  if (rowData.c[14]) {
    $('dd.rowRights').text(rowData.c[14].v);
  };
  if (rowData.c[15]) {
    $('dd.rowSubject').text(rowData.c[15].v);
  };
  if (rowData.c[16]) {
    $('dd.rowType').text(rowData.c[16].v);
  };
  if (rowData.c[6]) {
    $('dd.rowURL').html('<a target="_blank" role="button" href="'+rowData.c[6].v+'">See More</a>');
  };
  //hide the labels for empty fields
  $('dd:empty').prev().hide();
  //open the modal - this uses the Pico CSS modal implementation
  $('.item-modal').attr('open', '');
};

//get queries from URL - variables indicate the current page and allow for an override source spreadsheet
function getQueries() {
  var queryString = window.location.search;
    if(queryString) {
      var urlParams = new URLSearchParams(queryString);
      if (urlParams.get('page')) {
      openPage = urlParams.get('page').replace('%20',' ');
      }
      if (urlParams.get('source')) {
      overrideSource = urlParams.get('source').replace('%20',' ');
      }
    }
};

//function to set up basic site configuration - header, style customizations from spreadsheet
function siteConfig (siteJsonData) {
  //siteConfigData contains the usable congiguration data, but we still need to call values by index number. This is why re-ordering the spreadsheet columns will cause issues
  var siteConfigData = siteJsonData.rows;

  //assign the site title and subtitle - it is advised but not required to also set these in the HTML
  if (siteConfigData[0].c['0']) {
    header = siteConfigData[0].c['0'].v;
  };
  if (siteConfigData[0].c['1']) {
    subhead = siteConfigData[0].c['1'].v;
  };
  if (siteConfigData[0].c['10']) {
    var headerImage = siteConfigData[0].c['10'].v;
  }
  //if this is the homepage, set the document title here - again, it is advised to also set this in the HTML. Also, show the hero image
  if (!openPage) {
    document.title = header;
    $('figure.hero').show();

  };
  //set the page header
  $('h1#head').text(header);
  $('h2#subhead').text(subhead);
  if (headerImage) {
    $('hgroup').prepend('<img class="header-image" src="'+headerImage+'">')
    $('#head').hide();
  }
  //make the header group go to home by reloading the page with no page queries
  $('hgroup *').on('click', function() {
      //update the URL query
    if (spreadsheetID == originalID) {
      window.location = window.location.href.split("?")[0]; 
    }
    else {
      window.location = window.location.href.split("?")[0]+'?source='+overrideSource;
      homeOpen();
    }
  });


  //set the hero image
  var heroItem='';
  var caption='';
  if (siteConfigData[0].c['4']) {
    heroItem=siteConfigData[0].c['4'].v;
  };
  if (siteConfigData[0].c['3']) {
    caption=siteConfigData[0].c['3'].v;
  };
  $('.hero').attr('item', heroItem).html('<img src="' + siteConfigData[0].c['2'].v + '" alt="' + caption + '"> <figcaption>' + caption + '</figcaption>');

  //set css variables - for more customization, edit the CSS. Refer to the Pico CSS documentation for guidance
  var r = document.querySelector(':root');
  r.style.setProperty('--primary', siteConfigData[0].c['5'].v );
  r.style.setProperty('--primary-hover', siteConfigData[0].c['6'].v );
  r.style.setProperty('--primary-focus', siteConfigData[0].c['7'].v );
  r.style.setProperty('--primary-inverse', siteConfigData[0].c['8'].v );
  r.style.setProperty('--font-family', siteConfigData[0].c['9'].v );
}

//function to build pages
function pages(pagesJsonData) {
    var pagesData = pagesJsonData.rows;
    var pagesCount = pagesData.length;

    //Variables needed in loop
    var pageTitle
    var pageText
    var pageQuery="";
    if (pagesData[0].c['2']) {
      homeQuery = pagesData[0].c['2'].v;
    }
  //loop through pages
  pagesData.forEach((page, i) =>
  {
    //write data for each page to variables
    if (page.c['0']){
      pageTitle = page.c['0'].v;
    }
    else {
      pageTitle = "Page "+i
    }
    //for page text, replace curly quotes with straight to avoid issues in HTML
    if (page.c['1']) {
      pageText = page.c['1'].v.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      if (markdown) {
        pageText=md.render(pageText);
      };
    }
    else {
      pageText = "";
      console.log("The page "+pageTitle+" does not have any text");
    }
    //pageQuery is not required - if no query, show all items
    if (pageQuery = page.c['2']) {
      pageQuery = page.c['2'].v;
    }
    else {
      pageQuery="";
    }
    if (page.c[3]) {
      pageSlug = page.c['3'].v;
    }
    else {
      pageSlug ="page-"+i
    }
    if (page.c['4']) {
      subPage = page.c['4'].v;
    }
    else {
      subPage = false;
    }
    if (page.c['5']) {
      parent = page.c['5'].v;
    }
    else {
      parent = "";
    }

    //Create pages menu
    var li = $('<li>')
      .addClass('menu-'+pageSlug)

    var a = $('<a>')
      .text(pageTitle)
      .attr('pagetitle', pageTitle)
      .attr('pagequery', pageQuery)
      .attr('pageslug', pageSlug)
      .attr('pagenavtype', 'menu')
      .attr('href', '#')
      .appendTo(li)
      .on( "click", function() {pageChange()});

    if (!subPage) {
      $(li).addClass('parent')
      var ul = $('<ul>')
        .addClass('subpage-menu')
        .addClass('submenu-'+pageSlug)
        .appendTo(li);
        $(li).appendTo('ul#pages');
    }
    else {
      var parentTitle = $('ul#pages li.menu-'+parent).find('a').attr('pageTitle');
      //var parentSlug = $('ul#pages li.parent:last-child').find('a').attr('pageSlug');
      var parentSlug = parent;
      var parentQuery = $('ul#pages li.menu-'+parent).find('a').attr('pageQuery');
      $(li).find('a').attr('parentTitle', parentTitle);
      var ul = $('<ul>')
        .addClass('subpage-menu')
        .addClass('submenu-'+pageSlug)
        .appendTo(li);
      $(li).appendTo('ul#pages li.menu-'+parent+' ul.submenu-'+parent);
    }


    //Create pages content - all pages are written to the pages container and the selector chooses which one is visible
    var article = $('<article>')
      .html(pageText)
      .addClass(pageSlug)
      .attr('pageslug', pageSlug)
      .attr('pagequery', pageQuery)
      .attr('pageindex', i)
      .attr('tabindex', -1);

    var header = $('<header>');
    var footer = $('<footer>');

    if (subPage) {
      var parentPage = $('<a>')
        .text('Part of the section ' + parentTitle)
        .addClass('parentLink')
        .attr('pagetitle', parentTitle)
        .attr('pageslug', parentSlug)
        .attr('pagequery', parentQuery)
        .attr('pagenavtype', 'child')
        .attr('href', '#')
        .on('click', function(){
          pageChange()
        })
        .appendTo(header);
    };

    var h2 = $('<h2>')
      .text(pageTitle)
      .appendTo(header);


    if (i>0) {
    var buttonPrevious = $('<button>')
      .text('Previous Page')
      .addClass('previous-page')
      .addClass('page-nav')
      .attr('targetpage', i-1)
      .on('click', function() {pageChangeIndex();})
      .appendTo(footer);
    };
    if (i<pagesCount-1) {
    var buttonNext = $('<button>')
      .text('Next Page')
      .addClass('next-page')
      .addClass('page-nav')
      .attr('targetpage', i+1)
      .on('click', function() {pageChangeIndex();})
      .appendTo(footer);
    };

    $(header).prependTo(article);
    $(footer).appendTo(article);
    $(article).appendTo('section#pages-container');


  //end of pages loop
  });
  //remove empty ul elements from Menu
  $('ul.subpage-menu:empty').remove();

  openPageFromQuery();

};
//function to open page from query - runs at the end of building pages and also whenever the back or forward buttons are used in the browser
function openPageFromQuery() {
  if (openPage) {
      //check if the page exists before trying to open it - if not just go to the homepage
      if ($('article.' + openPage).length>0) {
        $('#pages-container article').hide();
        $('article.'+ openPage).show();
        var articleTitle = $('article.'+ openPage +' h2').text();
        $('.items-head').text(articleTitle + ' - Related Items');
        $('article.'+ openPage +' h2').trigger('focus');
        document.title= articleTitle + " - " + header;
        $('body').animate(
          {
            scrollTop: $('article.' + openPage).offset().top,
          },
          800 //speed
        );
        $('figure.hero').hide();
    }
  }
  else {
    homeOpen();
  };
}
//function to open the home page
function homeOpen() {
    var firstPageHead = $('#pages-container article:nth-child(1) h2').text();
    $('.items-head').text(firstPageHead + ' - Related Items');
    $('figure.hero').show();
}

//function to build the datatable of items
function itemsDataTable(itemsJsonData) {
    var initialSearch = {"columns": [0,1,2,3,4,7,10,11,12,13,14,15,16,17]};
    if (openPage) {
      var thisPageQuery = $('article.'+openPage).attr('pagequery');
      if (thisPageQuery) {
          initialSearch = {"preDefined": { "criteria": [ { "condition": "contains", "data": "Keywords", "type": "string", "value": [ thisPageQuery ] } ], "logic": "AND" }, "columns": [0,1,2,3,4,7,10,11,12,13,14,15,16,17]};
    }
  }
  else if (homeQuery) {
    initialSearch = {"preDefined": { "criteria": [ { "condition": "contains", "data": "Keywords", "type": "string", "value": [ homeQuery ] } ], "logic": "AND" }, "columns": [0,1,2,3,4,7,10,11,12,13,14,15,16,17]};
  };

    //create datatable from sheet data
    itemsTable = $('#items').DataTable({
      data: itemsJsonData.rows,
      dom: 'fQtipr',
      searchBuilder :
        initialSearch,
      columns: [
        //The data for each row is stored in nested objects by column number
        { data: 'c.0.v', title: itemsJsonData.cols[0].label, name:'title', class: itemsJsonData.cols[0].label, defaultContent: '[Untitled]'},
        { data: 'c.1.v', title: itemsJsonData.cols[1].label, name:'date', visible:false},
        { data: 'c.2.v', title: itemsJsonData.cols[2].label, name:'creator', visible:false},
        { data: 'c.3.v', title: itemsJsonData.cols[3].label, name:'description', visible:false },
        { data: 'c.4.v', title: itemsJsonData.cols[4].label, name:'provider', visible:false },
        { data: 'c.5.v', title: itemsJsonData.cols[5].label, name:'thumbnail', class: itemsJsonData.cols[5].label, render: function(data, type, row, meta){
            if(type === 'display'){
              if(data) {
                data = '<img src="' + data + '" alt="item thumbnail"/>';
              }
          }
          return data;
        }},
        { data: 'c.6.v', title: itemsJsonData.cols[6].label, name:'url', visible:false },
        { data: 'c.7.v', title: itemsJsonData.cols[7].label, name:'keywords', visible:false },
        { data: 'c.8.v', title: itemsJsonData.cols[8].label, name:'file', visible:false },
        { data: 'c.9.v', title: itemsJsonData.cols[9].label, name:'id', visible:false },
        { data: 'c.10.v', title: itemsJsonData.cols[10].label, name:'coverage', visible:false },
        { data: 'c.11.v', title: itemsJsonData.cols[11].label, name:'format', visible:false },
        { data: 'c.12.v', title: itemsJsonData.cols[12].label, name:'language', visible:false },
        { data: 'c.13.v', title: itemsJsonData.cols[13].label, name:'relation', visible:false },
        { data: 'c.14.v', title: itemsJsonData.cols[14].label, name:'rights', visible:false },
        { data: 'c.15.v', title: itemsJsonData.cols[15].label, name:'subject', visible:false },
        { data: 'c.16.v', title: itemsJsonData.cols[16].label, name:'type', visible:false },
        { data: 'c.17.v', title: itemsJsonData.cols[17].label, name:'commentary', visible:false }
        // added terms from Dublin Core - Coverage	Format	Language	Relation	Rights	Subject	Type - to include concepts not represented in the DPLA output
      ],
    processing: true,
    "language":{
      "emptyTable":     "No matching items",
      "info":           "Showing _START_ to _END_ of _TOTAL_ items",
      "infoEmpty":      "Showing 0 to 0 of 0 items",
      "infoFiltered":   "(filtered from _MAX_ total items)",
      "search":         "",
      searchBuilder: {
        title: {
             0: 'Filter / Advanced Search',
             _: 'Filter / Advanced Search (%d)'
         },
         data: 'Field',
      }
    },
    "search": {
      //"search": homeQuery
    },
    "drawCallback": function(settings, json) {
      //after every draw, we need to reasign the modal click to the current set of items
      $('#collection tr').on('click', function(){
        var rowData=itemsTable.row(this).data();
        modalBuild(rowData);
      });
    },
    "initComplete": function(settings, json) {
      var table = this.api();
      //make show all button work
      $('.show-all').on('click', function() {

        table.search('').searchBuilder.rebuild().draw();
        $('.items-head').text('All Items');
      });


      //after the table is built, we use the data in the table to create the embeded items in each page

      var tableData=this.api().rows().data();
      $('#pages-container figure.include-item').each(function( i ) {
        var thisFigure = $(this);
        var thisItem = $(this).attr('item');

        table.rows().eq( 0 ).each( function (idx) {
          var rowData = table.row(idx).data();
          if ( rowData.c[9].v === thisItem) {
            if (rowData.c[8]) {
              thisFigure.html('<img src="'+rowData.c[8].v+'" alt="'+rowData.c[0].v+'"/><figcaption>'+rowData.c[0].v+'</figcaption>');
            }
            else if (rowData.c[5]) {
                thisFigure.html('<img src="'+rowData.c[5].v+'" alt="'+rowData.c[0].v+'"/><figcaption>'+rowData.c[0].v+'</figcaption>');
            };
            thisFigure.on('click', function() {
              modalBuild(rowData);
            });
            }
          });
      });
      //add modal click to hero figure
      var heroFigure = $('.hero').attr('item');
      if (heroFigure) {
        table.rows().eq( 0 ).each( function (idx) {
          var rowData = table.row(idx).data();
          if ( rowData.c[9].v === heroFigure) {
            $('.hero').on('click', function() {
              modalBuild(rowData);
            });

          }
      });
    };

      $('.dtsb-searchBuilder').wrap('<details class="advanced"</details>');
      $('.advanced').append('<summary role="button">Filter / Advanced Search</summary>');

    //remove loading indicator
    console.log('finished loading');
      $('#pages-container, #collection').show();
      $('main').attr('aria-busy', 'false');
  }

  });
}
