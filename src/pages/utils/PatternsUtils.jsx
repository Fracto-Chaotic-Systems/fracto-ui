import React from "react";
import { Chart as ChartJS, registerables } from "chart.js";
ChartJS.register(...registerables);

import { Scatter } from "react-chartjs-2";

import Complex from "../../../../../sdk/math/Complex";
import FractoUtil from "../../../../../sdk/FractoUtil";
import FractoFastCalc from "../../../../../sdk/FractoFastCalc";
import { find_bounds } from "../../chart/ChartUtils.jsx";

const EPSILON = 0.0001;
const ANIMATION_COLOR = "red";

const GRID_CONFIG = {
  color: function (context) {
    const pi_grid = context.tick.value / (Math.PI * 2);
    const diff = Math.abs(pi_grid - Math.round(pi_grid));
    if (diff < EPSILON && pi_grid > EPSILON) {
      return "#888888";
    }
    return context.tick.value === 0 ? "#aaaaaa" : "#dddddd";
  },
  lineWidth: function (context) {
    const pi_grid = context.tick.value / (Math.PI * 2);
    const diff = Math.abs(pi_grid - Math.round(pi_grid));
    if (diff < EPSILON && pi_grid > EPSILON) {
      return 1.5;
    }
    return context.tick.value === 0 ? 1.5 : 1;
  },
};

export const click_point_chart = (
  set1,
  other_sets,
  in_cardioid = false,
  escaper = false,
) => {
  if (!set1) {
    return [];
  }
  const bounds = find_bounds(set1, other_sets, in_cardioid, escaper);
  const options = {
    scales: {
      x: {
        grid: GRID_CONFIG,
        ticks: { display: false },
        min: bounds.min_x,
        max: bounds.max_x,
      },
      y: {
        grid: GRID_CONFIG,
        ticks: { display: false },
        min: bounds.min_y,
        max: bounds.max_y,
      },
    },
    animation: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };
  const cardinality = set1?.length - 1 || 0;
  const in_animation = false; // set2?.length > 1
  const data_dataset = {
    datasets: [
      {
        Id: 2,
        // label: in_cardioid ? 'Q' : 'Q',
        data: JSON.parse(JSON.stringify(other_sets)),
        backgroundColor: "black",
        pointRadius: in_animation ? 3 : 3,
        showLine: true,
      },
      {
        Id: 1,
        // label: set1_label,
        data: JSON.parse(JSON.stringify(set1)),
        backgroundColor: FractoUtil.fracto_pattern_color(cardinality || 0),
        pointRadius: in_animation ? 3 : 3,
        showLine: true,
      },
    ],
  };
  try {
    return <Scatter datasetIdKey="id1" data={data_dataset} options={options} />;
  } catch (e) {
    return [e.message];
  }
};

export const iteration_chart = (
  set1,
  in_cardioid,
  escaper,
  animation_index = -1,
) => {
  const options = {
    scales: {
      x: {
        grid: GRID_CONFIG,
        ticks: { display: false },
      },
      y: {
        grid: GRID_CONFIG,
        ticks: { display: false },
      },
    },
    animation: false,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };
  let min_y = 1000;
  let max_y = 0;
  let min_x = 1000;
  let max_x = 0;
  set1.forEach((point) => {
    if (point.y < min_y) {
      min_y = point.y;
    }
    if (point.y > max_y) {
      max_y = point.y;
    }
    if (point.x < min_x) {
      min_x = point.x;
    }
    if (point.x > max_x) {
      max_x = point.x;
    }
  });
  const delta_y = max_y - min_y;
  min_y -= delta_y * 0.15;
  max_y += delta_y * 0.15;
  options.scales.y.min = min_y;
  options.scales.y.max = max_y;

  const delta_x = max_x - min_x;
  options.scales.x.min = min_x;
  options.scales.x.max = max_x;

  const cardinality = set1?.length - 1 || 0;
  if (cardinality && !escaper) {
    min_x -= cardinality ? 0 : delta_x * 0.15;
    max_x += cardinality ? 0 : delta_x * 0.15;
    options.scales.x.min = min_x;
    options.scales.x.max = max_x;
  } else if (escaper) {
    options.scales.y.max = 2.0;
    options.scales.x.min = min_x;
    max_x += delta_x * 0.01;
    options.scales.x.max = max_x;
  }
  const data_dataset = { datasets: [] };
  if (animation_index >= 0 && set1[animation_index]) {
    const set2 = [
      { x: set1[animation_index]?.x || 0, y: min_y },
      { x: set1[animation_index]?.x || 0, y: set1[animation_index]?.y || 0 },
    ];
    data_dataset.datasets.push({
      Id: 2,
      label: "theta sweep",
      data: JSON.parse(JSON.stringify(set2)),
      backgroundColor: ANIMATION_COLOR,
      pointRadius: 4,
      borderColor: ANIMATION_COLOR,
      showLine: true,
    });
  }
  data_dataset.datasets.push({
    Id: 1,
    label: `r (${cardinality})`,
    data: JSON.parse(JSON.stringify(set1)),
    backgroundColor: FractoUtil.fracto_pattern_color(cardinality),
    borderColor: "lightgrey",
    showLine: true,
  });
  try {
    // console.log('data_dataset', data_dataset)
    return <Scatter datasetIdKey="id1" data={data_dataset} options={options} />;
  } catch (e) {
    return [e.message];
  }
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

export const normalize_angle = (angle) => {
  let result = angle;
  while (result < -Math.PI) {
    result += Math.PI * 2;
  }
  while (result > Math.PI) {
    result -= Math.PI * 2;
  }
  return result;
};

export const escape_points_chart = (
  click_point,
  in_cardioid,
  animation_index = -1,
) => {
  const escape_points = get_escape_points(click_point);
  const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
    click_point.x,
    click_point.y,
    -1,
  );
  // const Q_core_pos = FractoFastCalc.calculate_cardioid_Q(click_point.x, click_point.y, 1)
  const set2 = [Q_core_neg];
  // if (animation_index >= 0) {
  //    set2.push(escape_points[animation_index])
  // }
  return click_point_chart(
    escape_points,
    set2,
    in_cardioid,
    true,
    animation_index,
  );
};

export const rotateArray = (arr, n) => {
  const copy_arr = JSON.parse(JSON.stringify(arr));
  const len = copy_arr.length;
  n = n % len; // Handle cases where n > len
  return copy_arr.slice(len - n).concat(copy_arr.slice(0, len - n));
};

export const process_r_data = (
  orbital_points,
  Q,
  progress_offset = Math.PI / 4,
) => {
  if (!orbital_points) {
    return [];
  }
  let max_angle = 0;
  let best_distance = 0;
  // let best_index = 0
  const mapping = orbital_points.map((p, index) => {
    const point = new Complex(p.x, p.y);
    const magnitude_point = point.magnitude();
    if (magnitude_point > best_distance) {
      best_distance = magnitude_point;
      // best_index = index
    }
    const difference = point.offset(-Q.x, -Q.y);
    let angle = Math.atan2(difference.im, difference.re);
    while (angle < max_angle - progress_offset) {
      angle += Math.PI * 2;
    }
    max_angle = angle;
    return { x: angle, y: difference.magnitude() };
  });
  // if (best_index !== 0) {
  //    return rotateArray(mapping, best_index)
  // }
  return mapping;
};

export const r_theta_chart = (
  orbital_points,
  Q,
  in_cardioid,
  animation_index,
) => {
  if (!orbital_points) {
    return [];
  }
  const r_data = process_r_data(orbital_points, Q);
  return iteration_chart(r_data, in_cardioid, false, animation_index);
};

export const escape_r_theta_chart = (
  click_point,
  in_cardioid,
  animation_index,
) => {
  const escape_points = get_escape_points(click_point);
  const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
    click_point?.x || 0,
    click_point?.y || 0,
    -1,
  );
  const r_data = process_r_data(escape_points, Q_core_neg, Math.PI / 2);
  return iteration_chart(r_data, in_cardioid, true, animation_index);
};
