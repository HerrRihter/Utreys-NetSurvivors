// live/learn/templates.js: question generators for `type: "template"` questions (docs/DESIGN-LEARN-CORE.md, docs/PLAN-SUPERAPP.md,
// «Задания по инструментам»). A generator is (params, rng) => a plain question; LEARN.make draws an instance and keeps the template's id.
// Pure functions of params and rng: the same seed gives the same question.
(() => {
  const L = window.LEARN; if (!L) return;

  // chart: «what does this graph show?» A time series of `points` samples in one of the shapes below; the options are the shapes'
  // names, the right one is the drawn shape. Stage 1 gives the data only (`chart`: series, threshold, unit); the lesson screen of
  // stage 2 draws it (live/learn/charts.js). The shapes are STUBS until the L3 expert names the real patterns to recognise.
  const SHAPES = {
    spike: { name: 'Кратковременный всплеск', why: 'Значение резко выросло и быстро вернулось: разовое событие (пачка запросов, перезапуск), а не тренд.',
      at: (t, r, k) => (Math.abs(t - k.at) < 0.04 ? 3.2 : 1) * (1 + (r() - 0.5) * 0.12) },
    leak: { name: 'Постепенный рост (утечка)', why: 'Значение растёт ровно и долго, без возврата: так выглядят утечка памяти или растущая очередь.',
      at: (t, r) => (1 + t * 2.2) * (1 + (r() - 0.5) * 0.08) },
    drop: { name: 'Падение до нуля', why: 'Метрика упала в ноль и осталась там: сервис или сбор метрик перестал работать.',
      at: (t, r, k) => (t > k.at ? 0 : 1 + (r() - 0.5) * 0.12) },
    normal: { name: 'Норма, проблемы нет', why: 'Колебания в обычных пределах, без тренда и выбросов.',
      at: (t, r) => 1 + (r() - 0.5) * 0.15 },
  };
  L.GEN.chart = ({ metric = 'Задержка API, мс', base = 120, points = 60, shapes = Object.keys(SHAPES) } = {}, rng) => {
    const kinds = shapes.filter((s) => SHAPES[s]), shape = kinds[Math.floor(rng() * kinds.length)], k = { at: 0.35 + rng() * 0.4 };
    const series = Array.from({ length: points }, (_, i) => Math.round(base * SHAPES[shape].at(i / (points - 1), rng, k)));
    return { id: 'chart', type: 'single', text: `Что видно на графике «${metric}» за последний час?`, explanation: SHAPES[shape].why,
      options: kinds.map((s) => ({ id: s, text: SHAPES[s].name })), correct: [shape],
      chart: { metric, series, threshold: Math.round(base * 2), shape } };
  };
  L.SHAPES = SHAPES;
})();
