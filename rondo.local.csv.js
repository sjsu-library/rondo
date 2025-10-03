
/* Load site/pages/items sheets from a single Excel file (rondo.xlsx) and rendering the site. */
(function () {
  let itemsTable, openPage, header = document.title, subhead = "";
  const markdown = true;
  const md = window.markdownit ? window.markdownit({ html: true, linkify: true, typographer: true }) : null;

  function getQueries() {
    const qs = window.location.search; if (!qs) return;
    const p = new URLSearchParams(qs);
    if (p.get('page')) openPage = p.get('page').replace('%20', ' ');
  }

  let __SITE_JSON__, __PAGES_JSON__, __ITEMS_JSON__;
  const __blobURLs__ = {};

  function pretty(o) { return JSON.stringify(o, null, 2); }

  function setDownload($container, key, data, filename) {
    if (__blobURLs__[key]) URL.revokeObjectURL(__blobURLs__[key]);
    const url = URL.createObjectURL(new Blob([pretty(data)], { type: 'application/json' }));

    let $btn = $container.siblings('.download-json');
    if (!$btn.length) {
      $btn = $('<a class="download-json" role="button" style="margin-top:.5rem">Download JSON</a>')
        .insertAfter($container);
    }
    $btn.attr({ href: url, download: filename });
    __blobURLs__[key] = url;
  }

  function updateToolsPanel() {
    if (__SITE_JSON__) {
      const $site = $('.tools-site');
      $site.text(pretty(__SITE_JSON__));
      setDownload($site, 'site', __SITE_JSON__, 'site.json');
    }
    if (__PAGES_JSON__) {
      const $pages = $('.tools-pages');
      $pages.text(pretty(__PAGES_JSON__));
      setDownload($pages, 'pages', __PAGES_JSON__, 'pages.json');
    }
    if (__ITEMS_JSON__) {
      const $items = $('.tools-items');
      $items.text(pretty(__ITEMS_JSON__));
      setDownload($items, 'items', __ITEMS_JSON__, 'items.json');
    }
  }

  function sheetToGViz(ws) {
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
    if (!aoa.length) return { cols: [], rows: [] };
    const headers = (aoa[0] || []).map(h => (h ?? '').toString());
    const cols = headers.map(h => ({ label: h }));
    const rows = aoa.slice(1).map(r => ({
      c: headers.map((_, i) => ({ v: r[i] ?? null }))
    }));
    return { cols, rows };
  }

  function rowsByLabel(gviz) {
    const labels = (gviz.cols || []).map(c => (c.label || '').toLowerCase().trim());
    return (gviz.rows || []).map(r => {
      const o = {}; labels.forEach((lab, i) => { o[lab || `col${i}`] = r.c && r.c[i] ? r.c[i].v : null; });
      return o;
    });
  }
  const pick = (obj, ...names) => {
    for (const n of names) { const k = n.toLowerCase(); if (k in obj && obj[k] != null && obj[k] !== '') return obj[k]; }
    return null;
  };

  function siteConfig(siteJson) {
    const row = (siteJson.rows && siteJson.rows[0]) ? siteJson.rows[0].c : null;
    if (!row) return;

    if (row['0']) header = row['0'].v || header;          // Title
    if (row['1']) subhead = row['1'].v || subhead;        // Subtitle
    const heroURL = row['2']?.v || '';
    const heroCap = row['3']?.v || '';
    const heroItem = row['4']?.v || '';
    const cssPrim = row['5']?.v || '';
    const cssPrimH = row['6']?.v || '';
    const cssPrimF = row['7']?.v || '';
    const cssPrimI = row['8']?.v || '';
    const cssFont = row['9']?.v || '';
    const headerImg = row['10']?.v || '';

    if (!openPage) { document.title = header; $('figure.hero').show(); }

    $('h1#head').text(header);
    $('h2#subhead').text(subhead);
    if (headerImg) { $('hgroup').prepend('<img class="header-image" src="' + headerImg + '">'); $('#head').hide(); }
    $('.hero')
      .attr('item', heroItem)
      .html('<img src="' + heroURL + '" alt="' + heroCap + '"> <figcaption>' + heroCap + '</figcaption>');

    const r = document.documentElement;
    if (cssPrim) r.style.setProperty('--primary', cssPrim);
    if (cssPrimH) r.style.setProperty('--primary-hover', cssPrimH);
    if (cssPrimF) r.style.setProperty('--primary-focus', cssPrimF);
    if (cssPrimI) r.style.setProperty('--primary-inverse', cssPrimI);
    if (cssFont) r.style.setProperty('--font-family', cssFont);
  }

  function pages(pagesJson) {
    const rows = rowsByLabel(pagesJson);
    const count = rows.length;

    const $menu = $('ul#pages').empty();
    const $container = $('section#pages-container').empty();
    const idx = new Map();

    rows.forEach((row, i) => {
      const title = pick(row, 'title') || `Page ${i + 1}`;
      const query = pick(row, 'keywords') || '';
      const slug = (pick(row, 'slug') || `page-${i}`).toString().trim();
      const isSub = String(pick(row, 'subpage') || '').toLowerCase() === 'true';
      const parent = (pick(row, 'parent') || '').toString().trim();

      const $li = $('<li>').addClass(`menu-${slug}${isSub ? '' : ' parent'}`);
      $('<a>')
        .text(title)
        .attr({ pagetitle: title, pagequery: query, pageslug: slug, pagenavtype: 'menu', href: '#' })
        .on('click', function (e) { e.preventDefault(); pageChange(this); })
        .appendTo($li);
      $li.append($('<ul>').addClass('subpage-menu').addClass(`submenu-${slug}`));
      idx.set(slug, { title, query, slug, isSub, parent, i, $li });
    });

    idx.forEach(({ $li, isSub, parent }) => {
      if (!isSub) $menu.append($li);
      else {
        const p = idx.get(parent);
        (p ? p.$li.find(`ul.submenu-${parent}`) : $menu).append($li);
      }
    });

    rows.forEach((row, i) => {
      const title = pick(row, 'title') || `Page ${i + 1}`;
      let text = pick(row, 'text') || '';
      const query = pick(row, 'keywords') || '';
      const slug = (pick(row, 'slug') || `page-${i}`).toString().trim();
      const isSub = String(pick(row, 'subpage') || '').toLowerCase() === 'true';
      const parent = (pick(row, 'parent') || '').toString().trim();

      if (markdown && md && typeof md.render === 'function') {
        text = md.render(String(text).replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'));
      }

      const $article = $('<article>').addClass(slug)
        .attr({ pageslug: slug, pagequery: query, pageindex: i, tabindex: -1 });

      const $header = $('<header>');
      if (isSub && parent && idx.has(parent)) {
        const p = idx.get(parent);
        $('<a>').text('Part of the section ' + p.title)
          .addClass('parentLink')
          .attr({ pagetitle: p.title, pageslug: p.slug, pagequery: p.query, pagenavtype: 'child', href: '#' })
          .on('click', function (e) { e.preventDefault(); pageChange(this); })
          .appendTo($header);
      }
      $('<h2>').text(title).appendTo($header);

      const $footer = $('<footer>');
      if (i > 0) {
        $('<button>').text('Prev').addClass('previous-page page-nav')
          .attr('targetpage', i - 1).on('click', function (e) { e.preventDefault(); pageChangeIndex(this); }).appendTo($footer);
      }
      if (i < count - 1) {
        $('<button>').text('Next').addClass('next-page page-nav')
          .attr('targetpage', i + 1).on('click', function (e) { e.preventDefault(); pageChangeIndex(this); }).appendTo($footer);
      }

      $article.append($header).append(text).append($footer).appendTo($container);
    });

    $('ul.subpage-menu:empty').remove();
    openPageFromQuery();
  }

  function modalBuild(row){
  const get = i => row.c[i] ? row.c[i].v : '';
  const title = get(0) || '[Untitled]';

  const isImg = (u)=>/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test((u||'').trim());

  // Prefer column 5 (Thumbnail). Fall back to column 8 (File) only if it's an image URL.
  const thumbURL = get(5);
  const fileURL  = get(8);
  const imgURL   = isImg(thumbURL) ? thumbURL : (isImg(fileURL) ? fileURL : null);

  $('h3#modal-title').text(title);
  $('dd').empty(); $('dt').show(); $('.modal-image').empty();

  $('dd.rowRelation').empty().prev('dt').hide().end().hide();
  
  if (imgURL){
    $('.modal-image').html('<img src="'+imgURL+'" alt="'+title+'" loading="lazy" referrerpolicy="no-referrer">');
  }

  if (row.c[1])  $('dd.rowDate').text(get(1));
  if (row.c[2])  $('dd.rowCreator').text(get(2));
  if (row.c[3])  $('dd.rowDescription').text(get(3));
  if (row.c[4])  $('dd.rowProvider').text(get(4));
  if (row.c[17]) $('dd.rowCommentary').text(get(17));
  if (row.c[10]) $('dd.rowCoverage').text(get(10));
  if (row.c[11]) $('dd.rowFormat').text(get(11));
  if (row.c[12]) $('dd.rowLanguage').text(get(12));
  if (row.c[13]) $('dd.rowRelation').html('<a target="_blank" role="button" href="'+get(13)+'">Related Resource</a>');
  if (row.c[14]) $('dd.rowRights').text(get(14));
  if (row.c[15]) $('dd.rowSubject').text(get(15));
  if (row.c[16]) $('dd.rowType').text(get(16));
  if (row.c[6])  $('dd.rowURL').html('<a target="_blank" role="button" href="'+get(6)+'">See More</a>');

  $('dd:empty').prev().hide();

  // Open as a *modal* so it goes to the browser's top layer (above your header)
  const dlg = document.querySelector('.item-modal');
  if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  else $('.item-modal').attr('open',''); // fallback for older browsers
}


  /** Helper: reset SearchBuilder + (optionally) apply page keyword */
  function resetFiltersAndCollapse(query) {
    if (!itemsTable) return;

    itemsTable.search(''); // clear global search

    const preset = query
      ? { preDefined: { criteria: [{ condition: 'contains', data: 'Keywords', type: 'string', value: [query] }], logic: 'AND' } }
      : undefined;

    itemsTable.searchBuilder.rebuild(preset).draw();

    // Collapse the builder if visible
    const $sb = $(itemsTable.searchBuilder.container());
    if ($sb.is(':visible')) $sb.hide();
  }

  function itemsDataTable(itemsJson) {
    // Initial preset if we deep-link into a page
    let initialSearch = { columns: [0, 1, 2, 3, 4, 7, 10, 11, 12, 13, 14, 15, 16, 17] };
    if (openPage) {
      const q = $('article.' + openPage).attr('pagequery');
      if (q) {
        initialSearch = {
          preDefined: {
            criteria: [{ condition: 'contains', data: 'Keywords', type: 'string', value: [q] }],
            logic: 'AND'
          },
          columns: [0, 1, 2, 3, 4, 7, 10, 11, 12, 13, 14, 15, 16, 17]
        };
      }
    }

    itemsTable = $('#items').DataTable({
      data: itemsJson.rows,
      // Use 'Q' so SearchBuilder exists without Buttons; we'll toggle it ourselves
      dom: 'fQtipr',
      searchBuilder: initialSearch,
      columns: [
        { data: 'c.0.v', title: itemsJson.cols[0]?.label || 'Title', name: 'title', class: itemsJson.cols[0]?.label, defaultContent: '[Untitled]' },
        { data: 'c.1.v', title: itemsJson.cols[1]?.label || 'Date', name: 'date', visible: false },
        { data: 'c.2.v', title: itemsJson.cols[2]?.label || 'Creator', name: 'creator', visible: false },
        { data: 'c.3.v', title: itemsJson.cols[3]?.label || 'Description', name: 'description', visible: false },
        { data: 'c.4.v', title: itemsJson.cols[4]?.label || 'Provider', name: 'provider', visible: false },
        {
          data: 'c.5.v', title: itemsJson.cols[5]?.label || 'Thumbnail', name: 'thumbnail', class: itemsJson.cols[5]?.label, render: (data, type) => {
            if (type === 'display' && data) { return '<img src="' + data + '" alt="item thumbnail">'; }
            return data;
          }
        },
        { data: 'c.6.v', title: itemsJson.cols[6]?.label || 'URL', name: 'url', visible: false },
        { data: 'c.7.v', title: itemsJson.cols[7]?.label || 'Keywords', name: 'keywords', visible: false },
        { data: 'c.8.v', title: itemsJson.cols[8]?.label || 'File', name: 'file', visible: false },
        { data: 'c.9.v', title: itemsJson.cols[9]?.label || 'ID', name: 'id', visible: false },
        { data: 'c.10.v', title: itemsJson.cols[10]?.label || 'Coverage', name: 'coverage', visible: false },
        { data: 'c.11.v', title: itemsJson.cols[11]?.label || 'Format', name: 'format', visible: false },
        { data: 'c.12.v', title: itemsJson.cols[12]?.label || 'Language', name: 'language', visible: false },
        { data: 'c.13.v', title: itemsJson.cols[13]?.label || 'Relation', name: 'relation', visible: false },
        { data: 'c.14.v', title: itemsJson.cols[14]?.label || 'Rights', name: 'rights', visible: false },
        { data: 'c.15.v', title: itemsJson.cols[15]?.label || 'Subject', name: 'subject', visible: false },
        { data: 'c.16.v', title: itemsJson.cols[16]?.label || 'Type', name: 'type', visible: false },
        { data: 'c.17.v', title: itemsJson.cols[17]?.label || 'Commentary', name: 'commentary', visible: false },
      ],
      processing: true,
      language: {
        emptyTable: "No matching items",
        info: "Showing _START_ to _END_ of _TOTAL_ items",
        infoEmpty: "Showing 0 to 0 of 0 items",
        infoFiltered: "(filtered from _MAX_ total items)",
        search: "",
        searchBuilder: {
          title: { 0: 'Filter / Advanced Search', _: 'Filter / Advanced Search (%d)' },
          data: 'Field',
        }
      },
      drawCallback: function () {
        $('#collection tr').off('click').on('click', function () {
          const row = itemsTable.row(this).data();
          if (row) modalBuild(row);
        });
      },
      initComplete: function () {
        const api = this.api();

        // Build our own toggle button (no Buttons plugin required)
        const $tableContainer = $(api.table().container());
        const $filter = $tableContainer.find('.dataTables_filter');
        const $sb = $(api.searchBuilder.container());

        // Start hidden
        $sb.hide();

        // Simple toggle button
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

        $('.show-all').off('click').on('click', function () {
          resetFiltersAndCollapse(undefined);
          $('.items-head').text('All Items');
        });

        // hero → modal by ID
        const heroId = $('.hero').attr('item');
        if (heroId) {
          api.rows().every(function () {
            const row = this.data();
            if (row?.c[9]?.v == heroId) {
              $('.hero').off('click').on('click', () => modalBuild(row));
            }
          });
        }

        $('#pages-container, #collection').show();
        $('main').attr('aria-busy', 'false');
      }
    });
  }

  function pageChange(el) {
    const $t = $(el);
    const query = $t.attr('pagequery');
    const slug = $t.attr('pageslug');
    const articleTitle = $t.attr('pagetitle');

    $('#pages-container article').hide();
    $('article.' + slug).show();

    resetFiltersAndCollapse(query);

    $('.items-head').text(articleTitle + ' - Related Items');
    $('details').removeAttr('open');
    document.title = articleTitle + " - " + header;
    $('article.' + slug + ' h2').trigger('focus');
    $('figure.hero, #intro').hide();

    const headerH = $('header.top-header').outerHeight() || 0;
    $('html, body').stop(true).animate({ scrollTop: $('article.' + slug).offset().top - headerH - 12 }, 800);

    window.history.pushState(null, null, '?page=' + slug);
  }

  function pageChangeIndex(el) {
    const target = $(el).attr('targetpage');
    const $art = $("article[pageindex='" + target + "']");
    const query = $art.attr('pagequery');
    const slug = $art.attr('pageslug');
    const articleTitle = $art.find('h2').text();

    $('#pages-container article').hide();
    $('article.' + slug).show();

    resetFiltersAndCollapse(query);

    $('.items-head').text(articleTitle + ' - Related Items');
    $('details').removeAttr('open');
    document.title = articleTitle + " - " + header;
    $('article.' + slug + ' h2').trigger('focus');
    $('figure.hero, #intro').hide();

    const headerH = $('header.top-header').outerHeight() || 0;
    $('html, body').stop(true).animate({ scrollTop: $('article.' + slug).offset().top - headerH - 12 }, 800);

    window.history.pushState(null, null, '?page=' + slug);
  }

  function openPageFromQuery() {
    if (openPage && $('article.' + openPage).length) {
      $('#pages-container article').hide();
      $('article.' + openPage).show();
      const articleTitle = $('article.' + openPage + ' h2').text();
      $('.items-head').text(articleTitle + ' - Related Items');
      $('article.' + openPage + ' h2').trigger('focus');
      document.title = articleTitle + " - " + header;

      const headerH = $('header.top-header').outerHeight() || 0;
      $('html, body').stop(true).animate({ scrollTop: $('article.' + openPage).offset().top - headerH - 12 }, 800);

      $('figure.hero, #intro').hide();
    } else {
      homeOpen();
    }
  }

  function homeOpen() {
    const firstHead = $('#pages-container article:nth-child(1) h2').text();
    $('.items-head').text(firstHead + ' - Related Items');
    $('figure.hero').show();
    $('#intro').removeAttr('hidden');
    $('#pages-container article').hide();

    resetFiltersAndCollapse(undefined);
  }

  /* Fetches rondo.xlsx file and uses that to render the site. */
  async function boot() {
    getQueries();
    try {
      const res = await fetch('./rondo.xlsx');
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      const siteWS = wb.Sheets['Site'];
      const pagesWS = wb.Sheets['Pages'];
      const itemsWS = wb.Sheets['Items'];
      if (!siteWS || !pagesWS || !itemsWS) {
        throw new Error('Workbook must have sheets named: Site, Pages, Items');
      }

      const siteJson = sheetToGViz(siteWS);
      const pagesJson = sheetToGViz(pagesWS);
      const itemsJson = sheetToGViz(itemsWS);
      __SITE_JSON__ = siteJson;
      __PAGES_JSON__ = pagesJson;
      __ITEMS_JSON__ = itemsJson;

      $('.tools').off('click').on('click', function (e) {
        e.preventDefault();
        updateToolsPanel();
        $('.rondo-tools').attr('open', '');
      });

      siteConfig(siteJson);
      pages(pagesJson);
      itemsDataTable(itemsJson);

      $('hgroup *').off('click').on('click', function () {
        window.location = window.location.href.split("?")[0];
      });

      $('dialog a.close').off('click').on('click', function(){
  document.querySelectorAll('dialog').forEach(d=> d.close ? d.close() : d.removeAttribute('open'));
});
document.addEventListener("keydown", (e)=>{
  if (e.key==="Escape"){
    document.querySelectorAll('dialog').forEach(d=> d.close ? d.close() : d.removeAttribute('open'));
  }
});

    } catch (err) {
      console.error('Failed to load rondo.xlsx:', err);
      $('main').attr('aria-busy', 'false').append('<p style="color:#c00">Failed to load <code>rondo.xlsx</code>: ' + String(err) + '</p>');
    }
  }

  $(boot);
})();
