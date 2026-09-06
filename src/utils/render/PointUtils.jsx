import FractoFastCalc from "../../../../../sdk/FractoFastCalc";

const get_fracto_values = (click_point) => {
  if (click_point) {
    const start = performance.now();
    const fracto_values = FractoFastCalc.calc(click_point.x, click_point.y);
    const end = performance.now();
    return { elapsed_ms: end - start, ...fracto_values };
  } else {
    return { x: 0, y: 0 };
  }
};

export const get_cycles = (point_set, center) => {
  let current_theta = -1;
  let first_theta = 0;
  point_set.forEach((point, i) => {
    const diff_x = point.x - center.x;
    const diff_y = point.y - center.y;
    let theta = Math.atan2(diff_y, diff_x);
    while (theta < current_theta) {
      theta += Math.PI * 2;
    }
    if (current_theta === -1) {
      first_theta = theta;
    }
    current_theta = theta;
  });
  return Math.round((current_theta - first_theta) / (2 * Math.PI));
};

export const farey_sequence = (n) => {
  let seq = [
    [0, 1],
    [1, 1],
  ];
  for (let i = 2; i <= n; i++) {
    for (let j = 0; j < seq.length - 1; j++) {
      let [p1, q1] = seq[j];
      let [p2, q2] = seq[j + 1];
      if (q1 + q2 === i) {
        seq.splice(j + 1, 0, [p1 + p2, q1 + q2]);
        j++;
      }
    }
  }
  return seq.map((f) => {
    return {
      num: f[0],
      den: f[1],
      ratio: f[0] / f[1],
    };
  });
};

export const get_click_point_info = (click_point) => {
  if (!click_point) {
    return null;
  }
  const fracto_values = get_fracto_values(click_point);
  const in_cardioid = FractoFastCalc.point_in_main_cardioid(
    click_point.x,
    click_point.y,
  );
  const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
    click_point.x,
    click_point.y,
    -1,
  );
  const Q_core_pos = FractoFastCalc.calculate_big_cardioid_Q(
    click_point.x,
    click_point.y,
    1,
  );
  let cycles = 0;
  if (fracto_values.orbital_points) {
    cycles = get_cycles(fracto_values.orbital_points, Q_core_neg);
  }

  const two_pi_theta = Math.atan(Q_core_neg.y / Q_core_neg.x);
  let theta = two_pi_theta / (2 * Math.PI);
  if (theta < 0) {
    theta += 0.5;
  }
  const r = (-Q_core_neg.x * 2) / Math.cos(two_pi_theta);

  let orbital_points = fracto_values.orbital_points;
  let best_magnitude = 0;
  let best_cardinality = 0;
  let elapsed_new = 0;
  let all_zs = {};
  if (!fracto_values.pattern) {
    orbital_points = get_escape_points(click_point);
  }
  return {
    click_point,
    pattern: fracto_values.pattern,
    elapsed_ms: fracto_values.elapsed_ms,
    orbital_points,
    in_cardioid,
    Q_core_neg,
    Q_core_pos,
    iteration: fracto_values.iteration,
    cycles,
    all_zs,
    cardinality: best_cardinality,
    magnitude: best_magnitude,
    elapsed_new,
    r,
    theta,
  };
};

export const process_orbital_sets = (point_set, center) => {
  if (!point_set) {
    return [];
  }
  const r_set = point_set.map((point, i) => {
    const diff_x = point.x - center.x;
    const diff_y = point.y - center.y;
    return {
      x: i + 1,
      y: Math.sqrt(diff_x * diff_x + diff_y * diff_y),
    };
  });
  let current_theta = 0;
  const theta_set = point_set.map((point, i) => {
    const diff_x = point.x - center.x;
    const diff_y = point.y - center.y;
    let theta = Math.atan2(diff_y, diff_x);
    while (theta < current_theta) {
      theta += Math.PI * 2;
    }
    current_theta = theta;
    return {
      x: i + 1,
      y: theta,
    };
  });
  return { r_set, theta_set };
};

export const process_escape_sets = (p, center) => {
  const P_x = p.re || p.x;
  const P_y = p.im || p.y;
  let Q_x_squared = 0;
  let Q_y_squared = 0;
  let Q_x = 0;
  let Q_y = 0;
  let iteration = 1;
  const all_r_values = [];
  const all_theta_values = [];
  all_r_values.push({ x: 0, y: 0 });
  all_theta_values.push({ x: 0, y: 0 });
  let current_theta = 0;
  for (; iteration < 1000000; iteration++) {
    Q_y = 2 * Q_x * Q_y + P_y;
    Q_x = Q_x_squared - Q_y_squared + P_x;
    Q_x_squared = Q_x * Q_x;
    Q_y_squared = Q_y * Q_y;
    if (Q_x_squared + Q_y_squared > 4) {
      break;
    }
    const diff_x = Q_x - center.x;
    const diff_y = Q_y - center.y;
    const magnitude = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    all_r_values.push({ x: iteration, y: magnitude });
    let theta = Math.atan2(diff_y, diff_x);
    while (theta < current_theta) {
      theta += Math.PI * 2;
    }
    all_theta_values.push({ x: iteration, y: theta });
  }
  return {
    r_set: all_r_values,
    theta_set: all_theta_values,
  };
};

export const get_escape_points = (click_point) => {
  const P_x = click_point.x;
  const P_y = click_point.y;
  let Q_x_squared = 0;
  let Q_y_squared = 0;
  let Q_x = 0;
  let Q_y = 0;
  const escape_points = [{ x: 0, y: 0 }];
  for (let iteration = 0; iteration < 10000; iteration++) {
    Q_y = 2 * Q_x * Q_y + P_y;
    Q_x = Q_x_squared - Q_y_squared + P_x;
    Q_x_squared = Q_x * Q_x;
    Q_y_squared = Q_y * Q_y;
    const sum_squares = Q_x_squared + Q_y_squared;
    if (sum_squares > 16) {
      break;
    }
    escape_points.push({ x: Q_x, y: Q_y });
  }
  return escape_points;
};

export const get_magnitude = (point_set, center) => {
  if (!point_set) {
    return [];
  }
  let max_radius = 0;
  point_set.forEach((point, i) => {
    const diff_x = point.x - center.x;
    const diff_y = point.y - center.y;
    const magnitude = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
    if (max_radius < magnitude) {
      max_radius = magnitude;
    }
  });
  return 2 * max_radius;
};

export const round_places = (x, digits) => {
  const factor = Math.pow(10, digits);
  return Math.round(x * factor) / factor;
};
