"use strict";
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, optimize, formatTime } = require('../script.js');
const sample = fs.readFileSync(path.join(__dirname, '../data/esimerkkihinnat.csv'), 'utf8');
const rows = parseCsv(sample);
const csv = prices => 'aika;hinta_snt_kwh\n' + prices.map((p,i) => `2026-11-04T${String(i).padStart(2,'0')}:00;${p}`).join('\n');

test('V1/V4/V5: 4 tuntia, halvin klo 01–03, 0.08 euroa ja 2 kWh', () => {
  assert.equal(rows.length, 4);
  const r = optimize(rows, '1', '2');
  assert.equal(r.cost, 0.08);
  assert.equal(r.energy, 2);
  assert.equal(formatTime(r.start), '04.11.2026 klo 01:00');
  assert.equal(formatTime(r.end), '04.11.2026 klo 03:00');
});
test('V3: liian pitkä käyttöaika', () => assert.throws(() => optimize(rows, '1', '5'), /ylittää/));
test('V3: virheelliset tehot', () => {
  for (const value of ['', ' ', 'abc', '0', '-1', 'Infinity', 'NaN', '1e309']) assert.throws(() => optimize(rows, value, '2'), /tehoksi/);
});
test('V3: virheelliset käyttöajat', () => {
  for (const value of ['', 'abc', '0', '-1', '1.5', 'Infinity']) assert.throws(() => optimize(rows, '1', value), /käyttöajaksi/);
});
test('V3/V4: desimaalipilkku ja kolmen tunnin jakso', () => {
  const r = optimize(rows, '1,5', '3');
  assert.equal(r.cost, 0.27);
  assert.equal(r.energy, 4.5);
  assert.equal(r.start, rows[0].time);
});
test('V4: yhden tunnin ja koko aineiston jaksot', () => {
  assert.equal(optimize(rows, 1, 1).cost, 0.03);
  assert.equal(optimize(rows, 1, 4).cost, 0.30);
});
test('V4: tasahinta valitsee aikaisimman', () => assert.equal(optimize(parseCsv(csv([5,5,5])), 1, 2).start, rows[0].time));
test('V4: desimaalien tasahinta ilman liukulukupoikkeamaa', () => assert.equal(optimize(parseCsv(csv(['0.1','0.2','0.3','0'])), 1, 2).start, rows[0].time));
test('V2/V4: negatiiviset ja nollahinnat', () => {
  assert.equal(optimize(parseCsv(csv([5,-2,0,4])), 1, 2).cost, -0.02);
  assert.equal(optimize(parseCsv(csv([0,0])), 1, 2).cost, 0);
});
test('V2: tyhjä aineisto ja väärä otsikko', () => {
  for (const value of ['', 'aika;hinta_snt_kwh', 'aika;hinta\n2026-11-04T00:00;2']) assert.throws(() => parseCsv(value));
});
test('V2: puuttuvat ja ei-numeeriset hinnat', () => {
  for (const value of ['', 'abc', 'NaN', 'Infinity', '1,5', '0x10']) assert.throws(() => parseCsv(csv([value])), /hinnan/);
});
test('V2: puuttuvat, päällekkäiset ja väärin järjestetyt tunnit', () => {
  for (const hour of ['00','02']) assert.throws(() => parseCsv(`aika;hinta_snt_kwh\n2026-11-04T00:00;1\n2026-11-04T${hour}:00;2`), /peräkkäisiä/);
  assert.throws(() => parseCsv('aika;hinta_snt_kwh\n2026-11-04T01:00;1\n2026-11-04T00:00;2'), /peräkkäisiä/);
});
test('V2: virheelliset päivät ja ei-tasatunnit', () => {
  for (const date of ['2026-02-30T00:00','2026-02-29T00:00','2026-13-01T00:00','2026-11-04T24:00','2026-11-04T00:15']) assert.throws(() => parseCsv(`aika;hinta_snt_kwh\n${date};1`));
});
test('V5: lopetuspäivämäärä vaihtuu keskiyöllä', () => {
  const r = optimize(parseCsv('aika;hinta_snt_kwh\n2026-12-31T23:00;1'), 1, 1);
  assert.equal(formatTime(r.end), '01.01.2027 klo 00:00');
});
test('V1: BOM ja Windows-rivinvaihdot', () => assert.equal(parseCsv('\uFEFF' + sample.replace(/\n/g,'\r\n')).length, 4));
test('V2: sisäinen tyhjä rivi ja ylimääräinen sarake', () => {
  assert.throws(() => parseCsv(sample.replace('2026-11-04T01', '\n2026-11-04T01')));
  assert.throws(() => parseCsv(csv(['1;2'])));
});
test('V3: laskennan ylivuoto hylätään', () => assert.throws(() => optimize(rows, '9'.repeat(308), 2), /liian suuria/));
test('V2: kokorajoitus', () => assert.throws(() => parseCsv('x'.repeat(1000001)), /liian suuri/));
