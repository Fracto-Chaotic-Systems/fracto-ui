import { midi } from "./fixtures.js";
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async () => {
  await frame();
  await frame();
};
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const region = () =>
  document.querySelector('[aria-label="MIDI track timeline"]');
const labels = () => [...region().querySelectorAll("button[aria-pressed]")];
const slider = () => document.querySelector('input[aria-label="Zoom"]');
const native_value = (element, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    element,
    value,
  );
  element.dispatchEvent(new Event("input", { bubbles: true }));
};
const choose = (bytes) => {
  const input = document.querySelector('#page input[type="file"]');
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], "track-view.mid"));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};
const file = (tracks) =>
  new Uint8Array([
    77,
    84,
    104,
    100,
    0,
    0,
    0,
    6,
    0,
    tracks.length === 1 ? 0 : 1,
    0,
    tracks.length,
    1,
    224,
    ...tracks.flatMap((bytes) => [
      77,
      84,
      114,
      107,
      0,
      (bytes.length >>> 16) & 255,
      (bytes.length >>> 8) & 255,
      bytes.length & 255,
      ...bytes,
    ]),
  ]);
function aligned() {
  const viewport = region();
  const label = labels()[0];
  const canvas = label.parentElement.querySelector("canvas");
  check(
    Math.abs(
      label.getBoundingClientRect().left -
        viewport.getBoundingClientRect().left -
        1,
    ) < 2,
    "Sticky track label moved horizontally",
  );
  check(
    Math.abs(
      label.getBoundingClientRect().right - canvas.getBoundingClientRect().left,
    ) < 2,
    "Label/timeline horizontal alignment",
  );
  check(
    Math.abs(
      label.getBoundingClientRect().top - canvas.getBoundingClientRect().top,
    ) < 2,
    "Label/note vertical alignment",
  );
}
function has_notes() {
  const canvas = labels()[0].parentElement.querySelector("canvas");
  const pixels = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 0; i < pixels.length; i += 4)
    if (
      Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
        Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
        25 &&
      Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 180
    )
      return true;
  return false;
}
export async function verify_tracks(until) {
  await settle();
  check(region(), "Track viewer missing");
  aligned();
  check(has_notes(), "Note strips rendered empty");
  labels()[0].click();
  await settle();
  check(
    labels()[0].getAttribute("aria-pressed") === "true",
    "Track selection failed",
  );
  native_value(slider(), "3");
  await settle();
  check(
    region().scrollWidth > region().clientWidth * 4,
    "Zoom did not enlarge timeline",
  );
  region().scrollLeft = region().scrollWidth / 3;
  region().dispatchEvent(new Event("scroll"));
  await settle();
  aligned();
  [...document.querySelectorAll("button")]
    .find((button) => button.textContent === "Fit to view")
    .click();
  await settle();
  check(
    region().scrollLeft === 0 &&
      region().scrollWidth <= region().clientWidth + 1,
    "Fit did not reset the viewport",
  );
  const page = document.getElementById("page");
  page.style.width = "360px";
  await settle();
  await settle();
  aligned();
  check(
    region().scrollWidth <= region().clientWidth + 1,
    "Narrow pane did not resize fit",
  );
  page.style.width = "";
  await settle();
  const track = [0, 144, 60, 100, 131, 96, 128, 60, 0, 0, 255, 47, 0];
  choose(file(Array.from({ length: 64 }, () => track)));
  await until(
    () =>
      document.querySelector('#page [role="status"]')?.textContent ===
      "Ready to play.",
    "many-track file",
  );
  await settle();
  check(labels().length < 12, "Track rows were not virtualized");
  region().scrollTop = 2000;
  region().dispatchEvent(new Event("scroll"));
  await settle();
  aligned();
  check(
    Number(
      labels()[0]
        .getAttribute("aria-label")
        .match(/Track (\d+)/)?.[1],
    ) > 20,
    "Vertical scroll did not advance track rows",
  );
  const dense = [];
  for (let i = 0; i < 10000; i++) dense.push(0, 144, 60 + (i % 12), 100);
  for (let i = 0; i < 10000; i++)
    dense.push(...(i === 0 ? [131, 96] : [0]), 128, 60 + (i % 12), 0);
  dense.push(0, 255, 47, 0);
  choose(file([dense]));
  await until(
    () =>
      document.querySelector('#page [role="status"]')?.textContent ===
      "Ready to play.",
    "dense file",
  );
  await settle();
  check(has_notes(), "Dense note overview is empty");
  check(
    region().querySelectorAll("canvas").length < 12,
    "Dense notes created excessive DOM",
  );
  choose(midi);
  await until(
    () =>
      document.querySelector('#page [role="status"]')?.textContent ===
      "Ready to play.",
    "restore fixture",
  );
  await settle();
  check(
    slider().value === "0" &&
      !labels().some((label) => label.getAttribute("aria-pressed") === "true"),
    "File replacement did not reset view state",
  );
  return {
    note_strips: true,
    selection: true,
    horizontal_zoom_and_fit: true,
    aligned_labels: true,
    narrow_pane: true,
    virtualized_64_tracks: true,
    dense_10000_notes: true,
    replacement_resets_view: true,
  };
}
