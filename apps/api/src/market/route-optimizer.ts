/**
 * Оптимизатор маршрута по рынку (Промт 17, Часть B — ADR 0017).
 *
 * Чистые функции без зависимостей: расстояние — Manhattan по
 * демо-сетке рынка (шаги сетки передаются параметрами), порядок
 * обхода — минимальный путь от входа.
 *
 * Алгоритмы:
 * - n ≤ 12 — точный Held-Karp (DP по подмножествам), O(n²·2ⁿ);
 *   для 12 точек ≈ 590k операций — мгновенно;
 * - n > 12 — nearest neighbor от входа + 2-opt до сходимости
 *   (кап 200 итераций) — эвристика, оптимальность не гарантируется
 *   (клиенту не сообщается, зафиксировано в unit-тестах).
 *
 * Детерминизм (урок 14a: иначе golden плывёт): входные остановки
 * сортируются по (row, spot, id), DP и эвристика перебирают
 * индексы в этом порядке и обновляют результат только при строгом
 * улучшении. Одинаковый вход → одинаковый маршрут всегда.
 */

/** Вход оптимизатора: точка сетки с идентификатором заказа. */
export interface OptimizeStop {
  id: string;
  row: number;
  spot: number;
}

/** Результат оптимизации: порядок, плечи, метры. */
export interface OptimizeResult {
  ordered: OptimizeStop[];
  /** legs[i] — метры от предыдущей точки до ordered[i] (у первой — от входа). */
  legs: number[];
  /** Метры от последней точки ко входу (только при returnToStart). */
  returnLegMeters?: number;
  totalMeters: number;
}

/** Шаги сетки рынка в метрах. */
export interface MarketSteps {
  spot: number;
  row: number;
}

/** Расстояние Manhattan по сетке рынка, метров. */
export function manhattanMeters(
  a: { row: number; spot: number },
  b: { row: number; spot: number },
  steps: MarketSteps,
): number {
  return (
    Math.abs(a.spot - b.spot) * steps.spot + Math.abs(a.row - b.row) * steps.row
  );
}

/** Канонический порядок остановок: (row, spot, id). */
function canonicalSort(stops: OptimizeStop[]): OptimizeStop[] {
  return [...stops].sort((x, y) => {
    if (x.row !== y.row) return x.row - y.row;
    if (x.spot !== y.spot) return x.spot - y.spot;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}

/** Плечи и итог для готового порядка. */
function buildResult(
  ordered: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
): OptimizeResult {
  const legs: number[] = [];
  let prev: { row: number; spot: number } = entrance;
  let total = 0;
  for (const stop of ordered) {
    const leg = manhattanMeters(prev, stop, steps);
    legs.push(leg);
    total += leg;
    prev = stop;
  }
  let returnLegMeters: number | undefined;
  if (returnToStart && ordered.length > 0) {
    returnLegMeters = manhattanMeters(prev, entrance, steps);
    total += returnLegMeters;
  }
  return { ordered, legs, returnLegMeters, totalMeters: total };
}

/** Длина пути порядка (path от входа; опционально замыкание). */
function pathLength(
  order: number[],
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
): number {
  let prev: { row: number; spot: number } = entrance;
  let total = 0;
  for (const i of order) {
    total += manhattanMeters(prev, stops[i], steps);
    prev = stops[i];
  }
  if (returnToStart && order.length > 0) {
    total += manhattanMeters(prev, entrance, steps);
  }
  return total;
}

/**
 * Точный Held-Karp: минимальный путь от входа по всем остановкам.
 * dp[mask][i] — минимум по путям, начинающимся во входе и
 * заканчивающимся в остановке i, посещающим множество mask.
 * Итог: path-версия (закончить где угодно) либо цикл
 * (returnToStart — плюс возврат ко входу от лучшего финала).
 */
function heldKarp(
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
): OptimizeResult {
  const n = stops.length;
  const dist: number[][] = stops.map((a) =>
    stops.map((b) => manhattanMeters(a, b, steps)),
  );
  const fromEntrance = stops.map((s) => manhattanMeters(entrance, s, steps));
  const toEntrance = fromEntrance; // Manhattan симметричен.

  const size = 1 << n;
  const INF = Number.POSITIVE_INFINITY;
  const dp: number[][] = Array.from({ length: size }, () =>
    new Array<number>(n).fill(INF),
  );
  const parent: number[][] = Array.from({ length: size }, () =>
    new Array<number>(n).fill(-1),
  );

  for (let i = 0; i < n; i += 1) {
    dp[1 << i][i] = fromEntrance[i];
  }
  for (let mask = 1; mask < size; mask += 1) {
    for (let last = 0; last < n; last += 1) {
      if (!(mask & (1 << last))) continue;
      const base = dp[mask][last];
      if (base === INF) continue;
      for (let next = 0; next < n; next += 1) {
        if (mask & (1 << next)) continue;
        const m2 = mask | (1 << next);
        const cand = base + dist[last][next];
        // Строгое улучшение: тай-брейки уходят порядку перебора,
        // а перебор — канонической сортировке входа.
        if (cand < dp[m2][next]) {
          dp[m2][next] = cand;
          parent[m2][next] = last;
        }
      }
    }
  }

  const full = size - 1;
  let best = INF;
  let bestLast = 0;
  for (let i = 0; i < n; i += 1) {
    const cost = dp[full][i] + (returnToStart ? toEntrance[i] : 0);
    if (cost < best) {
      best = cost;
      bestLast = i;
    }
  }

  // Восстановление порядка по родителям.
  const reversed: number[] = [];
  let mask = full;
  let cur = bestLast;
  while (cur !== -1 && mask !== 0) {
    reversed.push(cur);
    const p = parent[mask][cur];
    mask ^= 1 << cur;
    cur = p;
  }
  reversed.reverse();
  return buildResult(
    reversed.map((i) => stops[i]),
    entrance,
    steps,
    returnToStart,
  );
}

/** Nearest neighbor от входа (тай-брейки — канонический порядок). */
function nearestNeighbor(
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
): number[] {
  const n = stops.length;
  const used = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  let prev: { row: number; spot: number } = entrance;
  for (let step = 0; step < n; step += 1) {
    let bestIdx = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue;
      const d = manhattanMeters(prev, stops[i], steps);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    used[bestIdx] = true;
    order.push(bestIdx);
    prev = stops[bestIdx];
  }
  return order;
}

/**
 * 2-opt: развороты участков [i..j] до сходимости, кап итераций.
 * Индекс 0 фиксирован (первая от входа точка не двигается).
 */
function twoOpt(
  order: number[],
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
  capIterations: number,
): number[] {
  const current = [...order];
  let improved = true;
  let iterations = 0;
  while (improved && iterations < capIterations) {
    improved = false;
    iterations += 1;
    const base = pathLength(current, stops, entrance, steps, returnToStart);
    for (let i = 1; i < current.length - 1; i += 1) {
      for (let j = i + 1; j < current.length; j += 1) {
        const candidate = [
          ...current.slice(0, i),
          ...current.slice(i, j + 1).reverse(),
          ...current.slice(j + 1),
        ];
        const length = pathLength(
          candidate,
          stops,
          entrance,
          steps,
          returnToStart,
        );
        if (length < base) {
          current.length = 0;
          current.push(...candidate);
          improved = true;
        }
      }
    }
  }
  return current;
}

/**
 * Построить оптимальный маршрут по остановкам.
 *
 * @param stops остановки (id заказа + позиция сетки)
 * @param entrance вход (ряд 0, место 0)
 * @param steps шаги сетки в метрах ({ spot, row })
 * @param returnToStart замкнуть маршрут ко входу
 */
export function optimizeRoute(
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
): OptimizeResult {
  const sorted = canonicalSort(stops);
  if (sorted.length === 0) {
    return {
      ordered: [],
      legs: [],
      returnLegMeters: undefined,
      totalMeters: 0,
    };
  }
  if (sorted.length <= 12) {
    return heldKarp(sorted, entrance, steps, returnToStart);
  }
  const nn = nearestNeighbor(sorted, entrance, steps);
  const refined = twoOpt(nn, sorted, entrance, steps, returnToStart, 200);
  return buildResult(
    refined.map((i) => sorted[i]),
    entrance,
    steps,
    returnToStart,
  );
}

/** Полный перебор перестановок (n ≤ 7) — cross-check в тестах. */
export function bruteForceOptimal(
  stops: OptimizeStop[],
  entrance: { row: number; spot: number },
  steps: MarketSteps,
  returnToStart: boolean,
): number {
  const sorted = canonicalSort(stops);
  const n = sorted.length;
  if (n === 0) return 0;
  const permutation: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  let best = Number.POSITIVE_INFINITY;
  const recurse = () => {
    if (permutation.length === n) {
      const total = pathLength(
        permutation,
        sorted,
        entrance,
        steps,
        returnToStart,
      );
      if (total < best) best = total;
      return;
    }
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      permutation.push(i);
      recurse();
      permutation.pop();
      used[i] = false;
    }
  };
  recurse();
  return best;
}
