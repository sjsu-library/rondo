/* Load site/pages/items from Google Sheets (gviz) and render site.
   Items list is independent of pages: no auto-filtering by page. */
var spreadsheetID = "1JwJdUNSWp1ozuQBSamHM7DBnRKx2KDdilKFV5JbUcVQ";
var siteSheet  = "1569296108";
var pagesSheet = "28080804";
var itemsSheet = "0";

// override source via ?source=
var originalID = spreadsheetID;
var overrideSource = spreadsheetID;

var remote = true;

var itemsTable;
var openPage;
var header = document.title;
var subhead = "";
var markdown = true;
const md = markdownit({ html: true, linkify: true, typographer: true });

/* ---------- helpers ---------- */
function gvizRowsByLabel(gvizJson) {
  const labels = (gvizJson.cols || []).map(c => (c.label || '').toLowerCase().trim());
  const rows = (gvizJson.rows || []).map(r => {
    const o = {};
    labels.forEach((lab, i) => { o[lab || `col${i}`] = r.c && r.c[i] ? r.c[i].v : null; });
    return o;
  });
  return { labels, rows };
}
function pick(obj, ...names) {
  for (const n of names) {
    const k = n.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return null;
}
function getQueries() {
  const qs = window.location.search;
  if (!qs) return;
  const url = new URLSearchParams(qs);
  if (url.get("page"))   openPage = url.get("page").replace("%20", " ");
  if (url.get("source")) overrideSource = url.get("source").replace("%20", " ");
}
/* Clear all filters and (optionally) hide the builder panel */
function clearFilters(collapse) {
  if (!itemsTable) return;
  itemsTable.search('');
  itemsTable.searchBuilder.rebuild().draw();
  const $sb = $(itemsTable.searchBuilder.container());
  if (collapse) $sb.hide();
}

/* ---------- document ready ---------- */
$(document).ready(function () {
  getQueries();
  spreadsheetID = overrideSource;

  window.addEventListener("popstate", () => { getQueries(); openPageFromQuery(); });

  // Tools dialog
  $('.tools').on('click', function (e) { e.preventDefault(); $('.rondo-tools').attr('open', ''); });
  // Dialog closers
  $('dialog a.close').on('click', function(){
    document.querySelectorAll('dialog').forEach(d=> d.close ? d.close() : d.removeAttribute('open'));
  });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") {
    document.querySelectorAll('dialog').forEach(d=> d.close ? d.close() : d.removeAttribute('open'));
  }});
  document.addEventListener("click", (e)=>{ if ($(e.target).is('dialog')) {
    document.querySelectorAll('dialog').forEach(d=> d.close ? d.close() : d.removeAttribute('open'));
  }});

  if (remote) {
    google.charts.load('current', { packages: ['corechart'] }).then(function () {
      // Site
      new google.visualization.Query(
        `https://docs.google.com/spreadsheets/d/${spreadsheetID}/gviz/tq?gid=${siteSheet}&headers=1`
      ).send(function (res1) {
        if (res1.isError()) { console.log('Site error:', res1.getMessage(), res1.getDetailedMessage()); return; }
        const siteJson = JSON.parse(res1.getDataTable().toJSON());
        $('.tools-site').text(JSON.stringify(siteJson));
        siteConfig(siteJson);

        // Pages
        new google.visualization.Query(
          `https://docs.google.com/spreadsheets/d/${spreadsheetID}/gviz/tq?gid=${pagesSheet}&headers=1`
        ).send(function (res2) {
          if (res2.isError()) { console.log('Pages error:', res2.getMessage(), res2.getDetailedMessage()); return; }
          const pagesJson = JSON.parse(res2.getDataTable().toJSON());
          $('.tools-pages').text(JSON.stringify(pagesJson));
          pages(pagesJson);

          // Items
          new google.visualization.Query(
            `https://docs.google.com/spreadsheets/d/${spreadsheetID}/gviz/tq?gid=${itemsSheet}&headers=1`
          ).send(function (res3) {
            if (res3.isError()) { console.log('Items error:', res3.getMessage(), res3.getDetailedMessage()); return; }
            const itemsJson = JSON.parse(res3.getDataTable().toJSON());
            $('.tools-items').text(JSON.stringify(itemsJson));
            itemsDataTable(itemsJson);
          });
        });
      });
    });
  } else {
    // Local JSON fallback
    $.getJSON("json/site.json", function (siteJson) {
      siteConfig(siteJson);
      $.getJSON("json/pages.json", function (pagesJson) {
        pages(pagesJson);
        $.getJSON("json/items.json", function (itemsJson) {
          itemsDataTable(itemsJson);
        });
      });
    });
    $('.localizing').html('<h5>Localizing Tools</h5><p>This Rondo site is currently running on local JSON files.');
  }
});

/* ---------- page navigation (no item filtering) ---------- */
function pageChange() {
  const query =  $(event.target).attr('pagequery'); // kept for future use if needed
  const slug  =  $(event.target).attr('pageslug');
  const title =  $(event.target).attr('pagetitle');

  $('#pages-container article').hide();
  $('article.'+slug).show();
  $('#intro').attr('hidden','');
  $('figure.hero').hide();

  // Items are independent → always show all
  clearFilters(true);

  $('.items-head').text(title + ' - Related Items');
  $('header.top-header details').removeAttr('open');
  document.title = title + " - " + header;
  $('article.' + slug + ' h2').trigger('focus');

  const headerH = $('header.top-header').outerHeight() || 0;
  $('html, body').stop(true).animate({ scrollTop: $('article.' + slug).offset().top - headerH - 12 }, 800);

  if (spreadsheetID == originalID) window.history.pushState(null, null, '?page='+slug);
  else window.history.pushState(null, null, '?source='+overrideSource+'&page='+slug);
}
function pageChangeIndex() {
  const target = $(event.target).attr('targetpage');
  const $art   = $("article[pageindex='" + target + "']");
  const slug   = $art.attr('pageslug');
  const title  = $art.find('h2').text();

  $('#pages-container article').hide();
  $('article.'+slug).show();
  $('#intro').attr('hidden','');
  $('figure.hero').hide();

  // Items are independent → always show all
  clearFilters(true);

  $('.items-head').text(title + ' - Related Items');
  $('header.top-header details').removeAttr('open');
  document.title = title + " - " + header;

  const headerH = $('header.top-header').outerHeight() || 0;
  $('html, body').stop(true).animate({ scrollTop: $('article.' + slug).offset().top - headerH - 12 }, 800);

  if (spreadsheetID == originalID) window.history.pushState(null, null, '?page='+slug);
  else window.history.pushState(null, null, '?source='+overrideSource+'&page='+slug);
}

function openPageFromQuery() {
  if (openPage && $('article.' + openPage).length) {
    $('#pages-container article').hide();
    $('article.'+ openPage).show();
    const title = $('article.'+ openPage +' h2').text();
    $('.items-head').text(title + ' - Related Items');
    $('article.'+ openPage +' h2').trigger('focus');
    document.title = title + " - " + header;

    const headerH = $('header.top-header').outerHeight() || 0;
    $('html, body').stop(true).animate({ scrollTop: $('article.' + openPage).offset().top - headerH - 12 }, 800);

    $('figure.hero').hide();
    $('#intro').attr('hidden', '');

    // Items are independent → always show all
    clearFilters(true);
  } else {
    homeOpen();
  }
}

function homeOpen() {
  const firstPageHead = $('#pages-container article:nth-child(1) h2').text();
  $('.items-head').text(firstPageHead + ' - Related Items');
  $('figure.hero').show();
  $('#intro').attr('hidden','');         // hide intro text (keep hero)
  $('#pages-container article').hide();
  $('#pages-container article:first').show();

  // Items are independent → always show all
  clearFilters(true);
}

/* ---------- site/pages renderer ---------- */
function siteConfig (siteJsonData) {
  const row0 = siteJsonData.rows?.[0]?.c || {};
  if (row0['0']) header = row0['0'].v;
  if (row0['1']) subhead = row0['1'].v;
  const headerImage = row0['10']?.v;

  if (!openPage) { document.title = header; $('figure.hero').show(); }
  $('#head').text(header);
  $('#subhead').text(subhead);
  if (headerImage) { $('hgroup').prepend('<img class="header-image" src="'+headerImage+'">'); $('#head').hide(); }

  $('hgroup *').on('click', function () {
    if (spreadsheetID == originalID) window.location = window.location.href.split("?")[0];
    else { window.location = window.location.href.split("?")[0]+'?source='+overrideSource; homeOpen(); }
  });

  // hero
  const heroItem = row0['4']?.v || '';
  const caption  = row0['3']?.v || '';
  $('.hero').attr('item', heroItem)
    .html('<img src="' + (row0['2']?.v || '') + '" alt="' + caption + '"><figcaption>' + caption + '</figcaption>');

  // CSS vars
  const r = document.documentElement;
  if (row0['5']) r.style.setProperty('--primary', row0['5'].v);
  if (row0['6']) r.style.setProperty('--primary-hover', row0['6'].v);
  if (row0['7']) r.style.setProperty('--primary-focus', row0['7'].v);
  if (row0['8']) r.style.setProperty('--primary-inverse', row0['8'].v);
  if (row0['9']) r.style.setProperty('--font-family', row0['9'].v);
}

function pages(pagesJsonData) {
  const { rows } = gvizRowsByLabel(pagesJsonData);
  const count = rows.length;

  $('ul#pages').empty();
  const $container = $('section#pages-container').empty();

  const idx = new Map();
  rows.forEach((row, i) => {
    const title = pick(row,'title') || `Page ${i+1}`;
    const query = pick(row,'keywords') || ''; // unused for filtering now
    const slug  = (pick(row,'slug') || `page-${i}`).toString().trim();
    const isSub = String(pick(row,'subpage')||'').toLowerCase()==='true';
    const parent= (pick(row,'parent')||'').toString().trim();

    const $li = $('<li>').addClass(`menu-${slug}${isSub ? '' : ' parent'}`);
    $('<a>')
      .text(title)
      .attr({ pagetitle:title, pagequery:query, pageslug:slug, pagenavtype:'menu', href:'#' })
      .on('click', function(e){ e.preventDefault(); pageChange(); })
      .appendTo($li);
    $li.append($('<ul>').addClass('subpage-menu').addClass(`submenu-${slug}`));
    idx.set(slug, { title, query, slug, isSub, parent, i, $li });
  });

  idx.forEach(({ $li, isSub, parent })=>{
    if (!isSub) $('ul#pages').append($li);
    else {
      const p = idx.get(parent);
      (p ? p.$li.find(`ul.submenu-${parent}`) : $('ul#pages')).append($li);
    }
  });

  rows.forEach((row, i)=>{
    const title = pick(row,'title') || `Page ${i+1}`;
    let   text  = pick(row,'text')  || '';
    const query = pick(row,'keywords') || '';
    const slug  = (pick(row,'slug') || `page-${i}`).toString().trim();
    const isSub = String(pick(row,'subpage')||'').toLowerCase()==='true';
    const parent= (pick(row,'parent')||'').toString().trim();

    if (markdown && typeof md.render==='function'){
      text = md.render(String(text).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"'));
    }

    const $article = $('<article>').addClass(slug)
      .attr({ pageslug:slug, pagequery:query, pageindex:i, tabindex:-1 });

    const $header = $('<header>');
    if (isSub && parent && idx.has(parent)){
      const p = idx.get(parent);
      $('<a>').text('Part of the section ' + p.title)
        .addClass('parentLink')
        .attr({ pagetitle:p.title, pageslug:p.slug, pagequery:p.query, pagenavtype:'child', href:'#' })
        .on('click', function(e){ e.preventDefault(); pageChange(); })
        .appendTo($header);
    }
    $('<h2>').text(title).appendTo($header);

    const $footer = $('<footer>');
    if (i>0){
      $('<button>').text('Prev Page').addClass('previous-page page-nav')
        .attr('targetpage', i-1).on('click', function(e){ e.preventDefault(); pageChangeIndex(); }).appendTo($footer);
    }
    if (i<count-1){
      $('<button>').text('Next Page').addClass('next-page page-nav')
        .attr('targetpage', i+1).on('click', function(e){ e.preventDefault(); pageChangeIndex(); }).appendTo($footer);
    }

    $article.append($header).append(text).append($footer).appendTo($container);
  });

  $('ul.subpage-menu:empty').remove();
  openPageFromQuery();
}

/* ---------- modal (no Related Resource) ---------- */
function modalBuild(row){
  const get = i => row?.c?.[i]?.v ?? '';
  const title = get(0) || '[Untitled]';
  const isImg = (u)=>/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test((u||'').trim());
  const thumb = get(5), file = get(8);
  const imgURL = isImg(thumb) ? thumb : (isImg(file) ? file : null);

  $('h3#modal-title').text(title);
  $('dd').empty(); $('dt').show(); $('.modal-image').empty();

  // remove Related Resource row completely
  $('dd.rowRelation').empty().prev('dt').hide().end().hide();
  if (get(8)) {
    var extension = get(8).split('.').pop().trim();
    
    if (get(8).includes("https://www.youtube.com/watch?v=")){
      var youTubeID = get(8).split('v=').pop();
      $('figure.modal-image').html('<iframe width="560" height="315" src="https://www.youtube.com/embed/'+youTubeID+'" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe>')
    }
    else if (extension == "png" || "jpg" || "jpeg" || "PNG" || "JPG" || "JPEG" || "webp") {
      $('figure.modal-image').html('<a href="'+get(8)+'"><img src="'+get(8)+'" alt="'+title+'"/></a>');
    }
    else if (extension == "pdf") {
      $('figure.modal-image').html('<a target="_blank" role="button" href="'+get(8)+'">View PDF</a>');
    }
    else {
      $('figure.modal-image').html('<a target="_blank" role="button" href="'+get(8)+'">Download File</a>');
    }
  }
  else if (get(5)) {
      $('figure.modal-image').html('<img src="'+get(5)+'" alt="'+title+'"/>');
  };

  //if (imgURL) $('.modal-image').html('<img src="'+imgURL+'" alt="'+title+'" loading="lazy" referrerpolicy="no-referrer">');

  if (get(1))  $('dd.rowDate').text(get(1));        else $('dd.rowDate').prev().hide().end().hide();
  if (get(2))  $('dd.rowCreator').text(get(2));     else $('dd.rowCreator').prev().hide().end().hide();
  if (get(3))  $('dd.rowDescription').text(get(3)); else $('dd.rowDescription').prev().hide().end().hide();
  if (get(4))  $('dd.rowProvider').text(get(4));    else $('dd.rowProvider').prev().hide().end().hide();
  if (get(17)) $('dd.rowCommentary').text(get(17)); else $('dd.rowCommentary').prev().hide().end().hide();
  if (get(10)) $('dd.rowCoverage').text(get(10));   else $('dd.rowCoverage').prev().hide().end().hide();
  if (get(11)) $('dd.rowFormat').text(get(11));     else $('dd.rowFormat').prev().hide().end().hide();
  if (get(12)) $('dd.rowLanguage').text(get(12));   else $('dd.rowLanguage').prev().hide().end().hide();

  if (get(14)) $('dd.rowRights').text(get(14));     else $('dd.rowRights').prev().hide().end().hide();
  if (get(15)) $('dd.rowSubject').text(get(15));    else $('dd.rowSubject').prev().hide().end().hide();
  if (get(16)) $('dd.rowType').text(get(16));       else $('dd.rowType').prev().hide().end().hide();

  if (get(6))  $('dd.rowURL').html('<a target="_blank" role="button" href="'+get(6)+'">See More</a>');
  else         $('dd.rowURL').empty().prev().hide().end().hide();

  $('dd:empty').prev().hide();

  const dlg = document.querySelector('.item-modal');
  if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  else $('.item-modal').attr('open','');
}

/* ---------- items table (independent of pages) ---------- */
function itemsDataTable(itemsJsonData) {
  // No initial page-based preset; show everything
  const initialSearch = { columns: [0,1,2,3,4,7,10,11,12,13,14,15,16,17] };

  itemsTable = $('#items').DataTable({
    data: itemsJsonData.rows,
    dom: 'fQtipr',             // keep SearchBuilder available without Buttons
    searchBuilder : initialSearch,
    columns: [
      { data: 'c.0.v',  title: itemsJsonData.cols[0].label,  name:'title',     class: itemsJsonData.cols[0].label, defaultContent: '[Untitled]' },
      { data: 'c.1.v',  title: itemsJsonData.cols[1].label,  name:'date',      visible:false },
      { data: 'c.2.v',  title: itemsJsonData.cols[2].label,  name:'creator',   visible:false },
      { data: 'c.3.v',  title: itemsJsonData.cols[3].label,  name:'description', visible:false },
      { data: 'c.4.v',  title: itemsJsonData.cols[4].label,  name:'provider',  visible:false },
      { data: 'c.5.v',  title: itemsJsonData.cols[5].label,  name:'thumbnail', class: itemsJsonData.cols[5].label,
        render: function(data, type){ if(type === 'display' && data){ return '<img src="'+data+'" alt="item thumbnail"/>'; } return data; } },
      { data: 'c.6.v',  title: itemsJsonData.cols[6].label,  name:'url',       visible:false },
      { data: 'c.7.v',  title: itemsJsonData.cols[7].label,  name:'keywords',  visible:false },
      { data: 'c.8.v',  title: itemsJsonData.cols[8].label,  name:'file',      visible:false },
      { data: 'c.9.v',  title: itemsJsonData.cols[9].label,  name:'id',        visible:false },
      { data: 'c.10.v', title: itemsJsonData.cols[10].label, name:'coverage',  visible:false },
      { data: 'c.11.v', title: itemsJsonData.cols[11].label, name:'format',    visible:false },
      { data: 'c.12.v', title: itemsJsonData.cols[12].label, name:'language',  visible:false },
      { data: 'c.13.v', title: itemsJsonData.cols[13].label, name:'relation',  visible:false },
      { data: 'c.14.v', title: itemsJsonData.cols[14].label, name:'rights',    visible:false },
      { data: 'c.15.v', title: itemsJsonData.cols[15].label, name:'subject',   visible:false },
      { data: 'c.16.v', title: itemsJsonData.cols[16].label, name:'type',      visible:false },
      { data: 'c.17.v', title: itemsJsonData.cols[17].label, name:'commentary',visible:false }
    ],
    processing: true,
    language:{
      emptyTable: "No matching items",
      info: "Showing _START_ to _END_ of _TOTAL_ items",
      infoEmpty: "Showing 0 to 0 of 0 items",
      infoFiltered: "(filtered from _MAX_ total items)",
      search: "",
      searchBuilder: { title: {0:'Filter / Advanced Search', _: 'Filter / Advanced Search (%d)'}, data: 'Field' }
    },
    drawCallback: function(){
      $('#collection tr').off('click').on('click', function(){
        var rowData = itemsTable.row(this).data();
        if (rowData) modalBuild(rowData);
      });
    },
    initComplete: function(){
      var api = this.api();

      // "Show All" button clears everything
      $('.show-all').off('click').on('click', function(){
        clearFilters(false);                 // keep panel state
        $('.items-head').text('All Items');
      });

      // hero → modal by ID
      var heroFigure = $('.hero').attr('item');
      if (heroFigure) {
        api.rows().every(function () {
          var row = this.data();
          if (row?.c?.[9]?.v == heroFigure) $('.hero').off('click').on('click', ()=> modalBuild(row));
        });
      }

      // Simple toggle for SearchBuilder (hidden by default)
      const $tableContainer = $(api.table().container());
      const $filter = $tableContainer.find('.dataTables_filter');
      const $sb = $(api.searchBuilder.container());
      $sb.hide();
      const $toggle = $('<button type="button" class="toggle-sb">Filter / Advanced Search</button>')
        .css({ marginLeft: '0.5rem' })
        .on('click', function () {
          $sb.toggle();
          if ($sb.is(':visible')) {
            const headerH = $('header.top-header').outerHeight() || 0;
            $('html, body').animate({ scrollTop: $sb.offset().top - headerH - 12 }, 300);
          }
        });
      $filter.append($toggle);

      $('#pages-container, #collection').show();
      $('main').attr('aria-busy','false');
    }
  });
}
