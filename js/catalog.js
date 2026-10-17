/* Shared database, collection and outfit workspace. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const view = document.body.dataset.view;

  const categories = [
    ['', 'Everything'],
    ['Clothes', 'Player Clothes'],
    ['Player Accessories', 'Player Accessories'],
    ['Equipment', 'Horse Equipment'],
    ['Horses', 'Horses'],
    ['Horse Decorations', 'Horse Decorations'],
    ['Pets', 'Pets']
  ];

  const fields = [
    ['title', 'Name'],
    ['sc', 'SC'],
    ['js', 'JS'],
    ['ride', 'Riding'],
    ['jump', 'Jumping'],
    ['command', 'Command'],
    ['care', 'Care'],
    ['speed', 'Speed'],
    ['strength', 'Strength'],
    ['agility', 'Agility'],
    ['discipline', 'Discipline'],
    ['endurance', 'Endurance']
  ];

  let items = [];
  let user = null;
  let states = new Map();
  let active = '';
  let workspace = null;
  let ready = false;
  let visibleLimit = 60;
  let accountLoading = true;

  const pending = new Set();

  const key = item => `${item.kind}:${item.id}`;

  const text = (tag, value, cls) => {
    const node = document.createElement(tag);
    node.textContent = value;

    if (cls) node.className = cls;

    return node;
  };

  const button = (label, action) => {
    const node = text('button', label);
    node.type = 'button';
    node.addEventListener('click', action);

    return node;
  };

  function message(value) {
    $('catalog-message').textContent = value;
  }

  function requireAccount() {
    if (accountLoading) {
      message('Checking your account…');
      return false;
    }

    if (user) return true;

    const existing = $('database-login-dialog');

    if (existing?.open) return false;

    const dialog = document.createElement('dialog');

    dialog.id = 'database-login-dialog';
    dialog.className = 'database-login-dialog';

    dialog.setAttribute(
      'aria-labelledby',
      'database-login-title'
    );

    const heading = text('h2', 'Account required');
    heading.id = 'database-login-title';

    const prompt = text(
      'p',
      'To use this feature, please log in or create an account'
    );

    const actions = text(
      'div',
      '',
      'account-gate-actions'
    );

    const signup = text(
      'a',
      'Create account',
      'button'
    );

    signup.href = 'login.html#signup';

    const login = text('a', 'Log in');
    login.href = 'login.html';

    actions.append(
      signup,
      login,
      button('Close', () => dialog.close())
    );

    dialog.append(heading, prompt, actions);

    const previous = document.activeElement;

    dialog.addEventListener('close', () => {
      dialog.remove();

      if (previous?.isConnected) previous.focus();
    });

    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    document.body.append(dialog);
    dialog.showModal();

    return false;
  }

  async function json(path) {
    const response = await fetch(path, {
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw Error(
        `Could not load ${path} (${response.status}).`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw Error(`Invalid data in ${path}.`);
    }

    return data;
  }

  function number(value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ''
    ) {
      return null;
    }

    const result = Number(value);

    return Number.isFinite(result) ? result : null;
  }

  function overallStats(item) {
    const values = fields
      .slice(3)
      .map(([field]) => number(item[field]))
      .filter(value => value !== null);

    return values.length
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
  }

  function sortValue(item, field) {
    if (field === 'title') return item.title;

    if (field === 'shop') {
      return String(item.shop || '').trim() || null;
    }

    if (field === 'overall') {
      return overallStats(item);
    }

    return number(item[field]);
  }

  function compare(a, b, rules) {
    const status =
      window.HMItemStatus?.compare(a, b) || 0;

    if (status) return status;

    for (const { field, dir } of rules) {
      const av = sortValue(a, field);
      const bv = sortValue(b, field);

      // Missing values stay last in either direction.
      if (av == null && bv != null) return 1;
      if (bv == null && av != null) return -1;

      const comparison = av == null
        ? 0
        : (field === 'title' || field === 'shop')
          ? av.localeCompare(bv, undefined, {
              numeric: true,
              sensitivity: 'base'
            })
          : av - bv;

      if (comparison) {
        return comparison * (dir === 'desc' ? -1 : 1);
      }
    }

    return (
      a.title.localeCompare(b.title) ||
      key(a).localeCompare(key(b))
    );
  }

  window.HMCatalog = {
    compare,
    number,
    overallStats
  };

  function state(item) {
    return states.get(String(item.id)) || {};
  }

  async function loadStates() {
    states = new Map();

    if (!user) return;

    const { data, error } = await supabaseClient
      .from('user_items')
      .select('item_id,owned,wishlist,favorite')
      .eq('user_id', user.id);

    if (error) {
      throw Error(
        'Could not load your saved item states. ' +
        error.message
      );
    }

    for (const row of data) {
      states.set(String(row.item_id), row);
    }
  }

  async function toggle(item, field, control) {
    if (!requireAccount()) return;
    if (pending.has(key(item))) return;

    pending.add(key(item));

    document
      .querySelectorAll('[data-item-key]')
      .forEach(node => {
        if (node.dataset.itemKey === key(item)) {
          node.querySelectorAll('button').forEach(b => {
            b.disabled = true;
          });
        }
      });

    const before = state(item);

    const next = {
      owned: !!before.owned,
      wishlist: !!before.wishlist,
      favorite: !!before.favorite
    };

    next[field] = !next[field];

    const { error } = await supabaseClient
      .from('user_items')
      .upsert(
        {
          user_id: user.id,
          item_id: item.id,
          ...next
        },
        {
          onConflict: 'user_id,item_id'
        }
      );

    pending.delete(key(item));

    if (error) {
      message('Could not save this change: ' + error.message);
      render();
      return;
    }

    states.set(String(item.id), next);
    message('Saved.');
    render();
  }

  function image(item) {
    const wrap = text('div', '', 'catalog-image');

    if (
      item.image &&
      /^https?:\/\//i.test(item.image)
    ) {
      const img = document.createElement('img');

      img.src = item.image;
      img.alt = item.title;
      img.loading = 'lazy';

      img.addEventListener(
        'error',
        () => {
          wrap.replaceChildren(
            text('span', 'Image unavailable')
          );
        },
        { once: true }
      );

      wrap.append(img);
    } else {
      wrap.append(text('span', 'Image unavailable'));
    }

    return wrap;
  }

  function slot(item) {
    if (item.kind === 'horse') return null;
    if (item.category === 'Pets') return 'Pet';

    const section = String(item.section || '')
      .toLowerCase()
      .replace(/[_-]/g, ' ');

    const aliases = [
      ['Mane Decoration', /mane/],
      ['Tail Decoration', /tail/],
      ['Leg Wraps', /leg wrap|socks/],
      ['Saddle Bag', /saddle ?bag/],
      ['Horseshoes', /horseshoe|horse shoe/],
      ['Bridle', /bridle/],
      ['Blanket', /blanket|saddle pad/],
      ['Saddle', /saddle/],
      ['Hat', /hat|helmet/],
      ['Top', /top|shirt|jacket|sweater|coat/],
      ['Gloves', /glove/],
      ['Pants', /pant|breech|trouser/],
      ['Shoes', /shoe|boot/]
    ];

    const match = aliases.find(
      ([, expression]) => expression.test(section)
    );

    if (match) return match[0];

    const eligible = [
      'Clothes',
      'Player Accessories',
      'Equipment',
      'Horse Decorations'
    ].includes(item.category);

    return eligible && item.section
      ? String(item.section)
      : null;
  }

  async function addHorseHere(horse, control) {
    if (!requireAccount()) return;

    const entered = prompt(
      `Name your ${horse.breed || horse.title}:`
    );

    if (entered === null) return;

    const name = entered.trim();

    if (!name) {
      message('Enter a horse name to add it.');
      return;
    }

    control.disabled = true;

    const old = control.textContent;
    control.textContent = 'Adding…';

    try {
      const { error } = await supabaseClient
        .from('user_horses')
        .insert({
          user_id: user.id,
          horse_id: horse.id,
          name,
          nickname: null
        });

      if (error) throw error;

      message(`${name} was added to My Stable!`);

      await workspace?.refreshHorses();
    } catch (error) {
      message('Could not add horse: ' + error.message);
    } finally {
      control.disabled = false;
      control.textContent = old;
    }
  }

  function card(item) {
    const card = text('article', '', 'item-card');

    card.dataset.itemKey = key(item);

    card.classList.toggle(
      'is-uncertain',
      !!window.HMItemStatus?.isUncertain(item)
    );

    const horse = item.kind === 'horse';

    card.classList.toggle('horse-catalog-card', horse);

    const visual = text(
      'div',
      '',
      'catalog-card-visual'
    );

    visual.append(image(item));

    if (!horse) {
      visual.append(
        text(
          'span',
          item.section || item.category,
          'item-type-bubble'
        )
      );
    }

    card.append(
      visual,
      text(
        'h3',
        horse ? (item.breed || item.title) : item.title,
        'card-title'
      )
    );

    if (!horse && item.description) {
      card.append(
        text('p', item.description, 'card-description')
      );
    }

    card.append(
      text(
        'p',
        item.shop || 'Site / shop not verified',
        'card-location'
      )
    );

    if (
      item.level !== undefined &&
      item.level !== null &&
      String(item.level).trim() !== '' &&
      String(item.level) !== '0'
    ) {
      card.append(
        text(
          'p',
          `Level / requirement: ${item.level}`,
          'card-requirement'
        )
      );
    }

    const sc = number(item.sc);
    const js = number(item.js);
    const money = [];

    if (sc !== null) money.push(`SC ${sc}`);
    if (js !== null) money.push(`JS ${js}`);

    if (money.length) {
      card.append(
        text('p', money.join(' · '), 'card-price')
      );
    } else if (!horse) {
      card.append(
        text('p', 'SC～ ✧ JS～', 'card-price')
      );
    }

    if (item.price_note) {
      card.append(
        text('p', item.price_note, 'card-price-note')
      );
    }

    const stats = fields
      .slice(3)
      .filter(([field]) => number(item[field]) !== null)
      .map(([field, label]) => `${label} ${item[field]}`)
      .join(' · ');

    if (stats) {
      card.append(
        text('p', stats, 'stats card-stats')
      );
    }

    const actions = text('div', '', 'item-actions');

    if (horse) {
      actions.append(
        button(
          'Add to My Stable',
          event => addHorseHere(item, event.currentTarget)
        )
      );
    } else {
      const flags = [
        ['owned', '✓ I own this'],
        ['wishlist', '☆ Wishlist'],
        ['favorite', '♡ Favorite']
      ];

      for (const [field, label] of flags) {
        const action = button(
          label,
          event => toggle(item, field, event.currentTarget)
        );

        action.setAttribute(
          'aria-pressed',
          String(!!state(item)[field])
        );

        action.disabled =
          !ready || pending.has(key(item));

        actions.append(action);
      }
    }

    const itemSlot = slot(item);

    if (itemSlot) {
      const count = workspace?.count(item) || 0;

      const label = count
        ? `✓ In ${count} outfit${count === 1 ? '' : 's'}`
        : '+ Add to outfit';

      const action = button(label, event => {
        if (!requireAccount()) return;

        if (workspace) {
          workspace.openMenu(item, event.currentTarget);
        } else {
          message(
            'Outfit tools are unavailable. ' +
            'Refresh My Outfits and try again.'
          );
        }
      });

      action.className = 'outfit-menu-trigger';
      action.setAttribute('aria-expanded', 'false');
      action.setAttribute('aria-haspopup', 'dialog');

      actions.append(action);
    }

    card.append(actions);

    return card;
  }

  function render(reset = true) {
    if (!$('database-grid')) return;

    if (reset !== false) visibleLimit = 60;

    if (view === 'database') updateDBShops();

    const query = ($('search')?.value || '')
      .trim()
      .toLowerCase();

    const category = $('category-filter')?.value || '';
    const shop = $('shop-filter')?.value || '';
    const breed = $('breed-filter')?.value || '';
    const subtype = $('subcategory-filter')?.value || '';

    const flags = [
      ...document.querySelectorAll(
        '#state-filters input:checked'
      )
    ].map(node => node.value);

    const rules = [
      ...document.querySelectorAll('.sort-rule')
    ].map(node => ({
      field: node.querySelector('.sort-field').value,
      dir: node.querySelector('.sort-dir').value
    }));

    const filtered = items.filter(item => {
      const matchesCollection =
        view !== 'collection' ||
        (
          item.kind !== 'horse' &&
          state(item)[active]
        );

      const matchesTab =
        view === 'collection' ||
        !active ||
        item.category === active;

      const matchesCategory = view === 'database'
        ? (
            (!category || item.category === category) &&
            (!subtype || item.section === subtype)
          )
        : (!category || item.section === category);

      const matchesBreed =
        !breed ||
        (
          item.kind === 'horse' &&
          item.section === breed
        );

      const matchesShop = !shop || item.shop === shop;

      const matchesFlags =
        !flags.length ||
        (
          item.kind !== 'horse' &&
          flags.every(flag => state(item)[flag])
        );

      const searchable = [
        item.title,
        item.description || '',
        item.shop || '',
        item.section || '',
        ...(item.aliases || [])
      ].join(' ').toLowerCase();

      return (
        matchesCollection &&
        matchesTab &&
        matchesCategory &&
        matchesBreed &&
        matchesShop &&
        matchesFlags &&
        searchable.includes(query)
      );
    }).sort((a, b) => compare(a, b, rules));

    $('database-grid').replaceChildren(
      ...filtered.slice(0, visibleLimit).map(card)
    );

    $('catalog-load-more')?.remove();

    if (filtered.length > visibleLimit) {
      const more = button(
        `Load 60 more (${filtered.length - visibleLimit} remaining)`,
        () => {
          visibleLimit += 60;
          render(false);
        }
      );

      more.id = 'catalog-load-more';

      $('database-grid').after(more);
    }

    $('result-count').textContent =
      `${filtered.length} result${filtered.length === 1 ? '' : 's'}` +
      (
        filtered.length > visibleLimit
          ? ' · Showing ' + visibleLimit
          : ''
      );

    if (!filtered.length) {
      $('database-grid').append(
        text('p', 'No items match these filters.')
      );
    }
  }

  function options(select, values, first) {
    if (!select) return;

    select.replaceChildren(
      new Option(first, ''),
      ...values.map(value => new Option(value, value))
    );
  }

  function updateOptions() {
    if (view === 'database') {
      setupDBCascade();
      return;
    }

    const pool = items.filter(
      item =>
        view === 'collection' ||
        !active ||
        item.category === active
    );

    const inHorses =
      view === 'database' && active === 'Horses';

    const types = [
      ...new Set(
        pool
          .filter(item => inHorses || item.kind !== 'horse')
          .map(item => item.section)
          .filter(Boolean)
      )
    ].sort();

    options(
      $('category-filter'),
      types,
      inHorses ? 'All breeds' : 'All item types'
    );

    if (
      !inHorses &&
      pool.some(item => item.kind === 'horse')
    ) {
      $('category-filter')?.add(
        new Option('Horse', '__horse__')
      );
    }

    options(
      $('breed-filter'),
      [
        ...new Set(
          pool
            .filter(item => item.kind === 'horse')
            .map(item => item.section)
        )
      ].sort(),
      'All breeds'
    );

    updateBreedFilter();

    options(
      $('shop-filter'),
      [
        ...new Set(
          pool.map(item => item.shop).filter(Boolean)
        )
      ].sort(),
      'All sites / shops'
    );
  }

  const mainCategories = [
    ['Horse Decorations', 'Horse decoration'],
    ['Equipment', 'Equipment'],
    ['Clothes', 'Clothes'],
    ['Player Accessories', 'Player accessories']
  ];

  function updateDBSubcategories() {
    const main = $('category-filter')?.value || '';

    const pool = items.filter(
      item =>
        (!active || item.category === active) &&
        (!main || item.category === main)
    );

    options(
      $('subcategory-filter'),
      [
        ...new Set(
          pool.map(item => item.section).filter(Boolean)
        )
      ].sort((a, b) => a.localeCompare(b)),
      'All item types'
    );

    if ($('subcategory-wrap')) {
      $('subcategory-wrap').hidden = !main;
    }
  }

  function setupDBCascade() {
    const select = $('category-filter');

    if (!select) return;

    select.replaceChildren(
      new Option('All categories', ''),
      ...mainCategories.map(
        ([value, label]) => new Option(label, value)
      )
    );

    select.value = mainCategories.some(
      ([value]) => value === active
    ) ? active : '';

    const special =
      active === 'Horses' || active === 'Pets';

    if ($('main-category-wrap')) {
      $('main-category-wrap').hidden = special;
      $('main-category-wrap').parentElement.hidden = special;
    }

    updateDBSubcategories();

    options(
      $('breed-filter'),
      [
        ...new Set(
          items
            .filter(item => item.kind === 'horse')
            .map(item => item.section)
        )
      ].sort(),
      'All breeds'
    );

    if ($('breed-filter-wrap')) {
      $('breed-filter-wrap').hidden = active !== 'Horses';
    }

    updateDBShops();
  }

  function updateDBShops() {
    const main = $('category-filter')?.value || '';
    const subtype = $('subcategory-filter')?.value || '';
    const breed = $('breed-filter')?.value || '';

    const search = ($('search')?.value || '')
      .trim()
      .toLowerCase();

    const flags = [
      ...document.querySelectorAll(
        '#state-filters input:checked'
      )
    ].map(node => node.value);

    const matching = items.filter(item => {
      const searchable = [
        item.title,
        item.description || '',
        item.shop || '',
        item.section || '',
        ...(item.aliases || [])
      ].join(' ').toLowerCase();

      return (
        (!active || item.category === active) &&
        (!main || item.category === main) &&
        (!subtype || item.section === subtype) &&
        (!breed || item.section === breed) &&
        (
          !flags.length ||
          (
            item.kind !== 'horse' &&
            flags.every(flag => state(item)[flag])
          )
        ) &&
        searchable.includes(search)
      );
    });

    const shop = $('shop-filter');

    if (!shop) return;

    const previous = shop.value;

    const shops = [
      ...new Set(
        matching.map(item => item.shop).filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));

    options(shop, shops, 'All sites / shops');

    if (shops.includes(previous)) {
      shop.value = previous;
    }
  }

  function updateBreedFilter() {
    const show =
      active !== 'Horses' &&
      $('category-filter')?.value === '__horse__';

    if ($('breed-filter-wrap')) {
      $('breed-filter-wrap').hidden = !show;
    }

    if (!show && $('breed-filter')) {
      $('breed-filter').value = '';
    }
  }

  function activate(value) {
    active = value;

    const tabs = [
      ...document.querySelectorAll('[role="tab"]')
    ];

    tabs.forEach(tab => {
      const selected = tab.dataset.value === value;

      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    const tab = tabs.find(
      tab => tab.dataset.value === value
    );

    $('tab-heading').textContent = tab.textContent;

    $('catalog-panel').setAttribute(
      'aria-labelledby',
      tab.id
    );

    updateOptions();
    render();
  }

  function addSort(field = 'title', dir = 'asc') {
    const row = text('div', '', 'sort-rule');

    const fieldSelect = document.createElement('select');
    const directionSelect = document.createElement('select');

    fieldSelect.className = 'sort-field';
    fieldSelect.setAttribute('aria-label', 'Sort by');

    const sortOptions = [
      ...fields,
      ['overall', 'Overall stats (combined)'],
      ['shop', 'Location (site/shop)']
    ];

    sortOptions.forEach(([value, label]) => {
      fieldSelect.add(new Option(label, value));
    });

    fieldSelect.value = field;

    directionSelect.className = 'sort-dir';
    directionSelect.setAttribute(
      'aria-label',
      'Sort direction'
    );

    directionSelect.add(
      new Option('Ascending / A–Z', 'asc')
    );

    directionSelect.add(
      new Option('Descending / Z–A', 'desc')
    );

    directionSelect.value = dir;

    fieldSelect.addEventListener('change', () => {
      if (fieldSelect.value === 'overall') {
        directionSelect.value = 'desc';
      }

      render();
    });

    directionSelect.addEventListener('change', render);

    row.append(
      fieldSelect,
      directionSelect,
      button('Remove rule', () => {
        row.remove();
        render();
      })
    );

    $('sort-rules')?.append(row);
  }

  function setup() {
    const choices = view === 'collection'
      ? [
          ['owned', 'Owned'],
          ['wishlist', 'Wishlist'],
          ['favorite', 'Favorites']
        ]
      : categories;

    let hash = '';

    try {
      hash = decodeURIComponent(location.hash.slice(1));
    } catch {}

    active = choices.some(([value]) => value === hash)
      ? hash
      : choices[0][0];

    const tabs = $('catalog-tabs');

    choices.forEach(([value, label], index) => {
      const tab = button(label, () => {
        history.replaceState(
          null,
          '',
          '#' + encodeURIComponent(value)
        );

        activate(value);
      });

      tab.id = 'tab-' + index;
      tab.dataset.value = value;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'catalog-panel');

      tab.addEventListener('keydown', event => {
        const all = [...tabs.children];
        const position = all.indexOf(tab);

        const next = event.key === 'ArrowRight'
          ? all[(position + 1) % all.length]
          : event.key === 'ArrowLeft'
            ? all[(position - 1 + all.length) % all.length]
            : event.key === 'Home'
              ? all[0]
              : event.key === 'End'
                ? all.at(-1)
                : null;

        if (next) {
          event.preventDefault();
          next.click();
          next.focus();
        }
      });

      tabs.append(tab);
    });

    window.addEventListener('hashchange', () => {
      let value;

      try {
        value = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }

      if (choices.some(([choice]) => choice === value)) {
        activate(value);
      }
    });

    $('search')?.addEventListener('input', render);

    $('category-filter')?.addEventListener('change', () => {
      if (view === 'database') {
        const main = $('category-filter').value;

        if (active && main !== active) {
          history.replaceState(
            null,
            '',
            '#' + encodeURIComponent(main)
          );

          activate(main);
          return;
        }

        updateDBSubcategories();
        render();
      } else {
        updateBreedFilter();
        render();
      }
    });

    [
      'subcategory-filter',
      'breed-filter',
      'shop-filter',
      'state-filters'
    ].forEach(id => {
      $(id)?.addEventListener('change', render);
    });

    $('state-filters')?.addEventListener(
      'click',
      event => {
        if (
          !user &&
          event.target.closest('label,input')
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          requireAccount();
        }
      },
      true
    );

    $('add-sort')?.addEventListener('click', () => {
      addSort('sc', 'asc');
      render();
    });

    addSort();

    $('reset-filters')?.addEventListener('click', () => {
      $('search').value = '';

      updateOptions();

      document
        .querySelectorAll('#state-filters input')
        .forEach(input => {
          input.checked = false;
        });

      $('sort-rules').replaceChildren();

      addSort();
      render();
    });

    activate(active);
  }

  async function start() {
    if (window.HMFeatureAccess) {
      await window.HMFeatureAccess;
    }

    try {
      const [catalog, horses] = await Promise.all([
        json('data/database.json'),
        json('data/horses.json')
      ]);

      items = catalog.map(item => ({
        ...item,
        kind: 'item',
        title: String(item.title || 'Untitled item'),
        agility: item.agility ?? item.agil,
        discipline: item.discipline ?? item.disc
      })).concat(
        horses.map(horse => ({
          ...horse,
          kind: 'horse',
          category: 'Horses',
          section: horse.breed,
          title: horse.title ||
            `${horse.breed} ${horse.coat || ''}`.trim(),
          shop: horse.location
        }))
      );

      if (view !== 'outfits') setup();
    } catch (error) {
      message('Could not load catalog data: ' + error.message);
      return;
    }

    let authAvailable = true;

    try {
      if (typeof supabaseClient === 'undefined') {
        throw Error('Account service is unavailable.');
      }

      const { data, error } =
        await supabaseClient.auth.getUser();

      if (
        error &&
        error.name !== 'AuthSessionMissingError'
      ) {
        throw error;
      }

      user = data?.user || null;
    } catch (error) {
      authAvailable = false;

      message(
        'Catalog loaded. Account features are temporarily ' +
        'unavailable: ' + error.message
      );
    } finally {
      accountLoading = false;
    }

    if (authAvailable) {
      try {
        await loadStates();
        ready = true;
      } catch (error) {
        message(error.message);
      }

      supabaseClient.auth.onAuthStateChange(
        (event, session) => {
          if (
            (session?.user?.id || null) !==
            (user?.id || null)
          ) {
            setTimeout(() => location.reload(), 0);
          }
        }
      );
    }

    if (view !== 'outfits') render();

    try {
      if (typeof HMOutfitWorkspace === 'undefined') {
        throw Error('The outfit script did not load.');
      }

      workspace = await HMOutfitWorkspace.create({
        items,
        user,
        key,
        slot,
        image,
        text,
        button,
        number,
        fields,
        onChange: render,
        requireAccount,
        getOwnedIds: () => ready
          ? new Set(
              [...states.entries()]
                .filter(([, value]) => value.owned)
                .map(([id]) => id)
            )
          : null
      });
    } catch (error) {
      message(
        (view === 'database' ? 'Catalog loaded. ' : '') +
        'Outfit tools could not load: ' + error.message
      );

      console.error(
        'Outfit workspace initialization failed',
        error
      );
    }

    if (view !== 'outfits') render();
  }

  start();
})();
