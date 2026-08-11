import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = ["index.html", "privacy.html", "terms.html", "game.html"];
const expectedOrigin = "https://pharmacist65.github.io/iksir-yolu-legal/";

async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

test("required public files and assets exist", async () => {
  const required = [
    ".nojekyll",
    "styles.css",
    "assets/app-icon.png",
    "assets/og.jpg",
    "assets/evidence-tr.jpg",
    "assets/evidence-en.jpg",
    "assets/brewing-tr.jpg",
    "assets/brewing-en.jpg",
    "assets/consequence-tr.jpg",
    "assets/consequence-en.jpg",
    ...htmlFiles,
  ];
  await Promise.all(required.map((file) => access(path.join(root, file))));
});

for (const file of htmlFiles) {
  test(`${file} has complete metadata and subpath-safe local links`, async () => {
    const html = await source(file);
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="(?:tr|en)">/i);
    assert.match(html, /<meta name="viewport"/i);
    assert.match(html, /<link rel="canonical" href="https:\/\/pharmacist65\.github\.io\/iksir-yolu-legal\//i);
    assert.match(html, /<meta property="og:url" content="https:\/\/pharmacist65\.github\.io\/iksir-yolu-legal\//i);
    assert.match(html, /<meta property="og:image" content="https:\/\/pharmacist65\.github\.io\/iksir-yolu-legal\/assets\/og\.jpg">/i);
    assert.doesNotMatch(html, /(?:href|src)="\//i, "root-relative links break project GitHub Pages");
    assert.doesNotMatch(html, /\{\{|\}\}|<CONTACT_|TODO|FIXME/i);
    assert.doesNotMatch(html, /https?:\/\/(?:fonts|cdn|unpkg|jsdelivr)\./i, "site should not depend on third-party UI CDNs");

    const links = [...html.matchAll(/(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
    for (const link of links) {
      if (/^(?:https?:|mailto:)/i.test(link)) continue;
      if (link.startsWith("#")) {
        assert.match(html, new RegExp(`id=["']${link.slice(1)}["']`), `${file} is missing ${link}`);
        continue;
      }
      const localPath = link.split(/[?#]/, 1)[0];
      await access(path.join(root, localPath));
    }
  });
}

test("privacy copy matches the current offline no-data build", async () => {
  const privacy = await source("privacy.html");
  assert.match(privacy, /uygulama veri toplamaz/i);
  assert.match(privacy, /the app does not collect data/i);
  assert.match(privacy, /reklam, izleme, abonelik veya uygulama içi satın alma bulunmaz/i);
  assert.match(privacy, /no ads, tracking, subscriptions, or in-app purchases/i);
  assert.doesNotMatch(privacy, /RevenueCat|AdMob|Google Mobile Ads|Firebase/i);
});

test("marketing page describes the current edition truthfully in both languages", async () => {
  const game = await source("game.html");
  assert.match(game, /çevrimdışı · hesap yok · reklam yok · uygulama içi satın alma yok/i);
  assert.match(game, /offline · no account · no ads · no in-app purchases/i);
  assert.match(game, /data-language-button="tr"/);
  assert.match(game, /data-language-button="en"/);
  assert.match(game, /https:\/\/cihangirakman\.com\//);
});

test("canonical URLs are unique and anchored to the intended Pages project", async () => {
  const canonicals = [];
  for (const file of htmlFiles) {
    const html = await source(file);
    const match = html.match(/<link rel="canonical" href="([^"]+)">/i);
    assert.ok(match);
    assert.ok(match[1].startsWith(expectedOrigin));
    canonicals.push(match[1]);
  }
  assert.equal(new Set(canonicals).size, htmlFiles.length);
});

