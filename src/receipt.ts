import { calculate, difference, number, rub } from "./model";
import type { Scenario } from "./model";
export function receiptText(s: Scenario, before: Scenario | null) {
  const c = calculate(s);
  const lines = [
    "СЧЁТ ЗА СОЗВОН",
    "Стоимость рабочего времени",
    "",
    `Участников: ${c.count}`,
    `Одна встреча: ${number(s.minutes)} мин`,
    `Встреч в месяц: ${number(s.meetings)}`,
    `Расчётных рабочих часов в месяц: ${number(s.hours)}`,
    "",
    `Одна встреча: ${rub(c.meeting)}`,
    `За месяц: ${rub(c.monthly)}`,
    `За год: ${rub(c.yearly)}`,
    `Человеко-часов в месяц: ${number(c.personHours, 1)}`,
  ];
  if (before) {
    const d = difference(before, s);
    lines.push(
      "",
      `ДО / месяц: ${rub(calculate(before).monthly)}`,
      `ПОСЛЕ / месяц: ${rub(c.monthly)}`,
      `${d.monthly.gte(0) ? "Высвобождено" : "Увеличение"} / месяц: ${rub(d.monthly.abs())}`,
      `За год: ${rub(d.yearly.abs())}`,
      `${d.personHours.gte(0) ? "Высвобождено" : "Дополнительно"} человеко-часов: ${number(d.personHours.abs(), 1)}`,
      d.percent === null
        ? "Процент: не определён (исходная стоимость 0 ₽)"
        : `Изменение стоимости: ${number(d.percent.negated(), 1)}%`,
    );
  }
  lines.push(
    "",
    "Сумма зарплат ÷ рабочие часы × длительность в часах.",
    "Это стоимость времени, а не автоматически потерянные деньги.",
    "siblife54-dot.github.io/howmuchsozvon/",
  );
  return lines.join("\n");
}
export async function receiptPng(
  s: Scenario,
  before: Scenario | null,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = before ? 1780 : 1510;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось создать изображение");
  ctx.fillStyle = "#e4e6dc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffef8";
  ctx.beginPath();
  ctx.moveTo(60, 40);
  ctx.lineTo(1040, 40);
  ctx.lineTo(1040, canvas.height - 55);
  for (let x = 1040; x >= 60; x -= 20)
    ctx.lineTo(x, canvas.height - (Math.round((1040 - x) / 20) % 2 ? 65 : 45));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#20221d";
  ctx.textAlign = "center";
  ctx.font = "700 60px Manrope Variable, sans-serif";
  ctx.fillText("СЧЁТ ЗА СОЗВОН", 550, 155);
  ctx.font = "23px IBM Plex Mono, monospace";
  ctx.fillText("СТОИМОСТЬ РАБОЧЕГО ВРЕМЕНИ", 550, 205);
  ctx.font = "22px IBM Plex Mono, monospace";
  ctx.fillText(
    new Intl.DateTimeFormat("ru-RU").format(new Date()),
    550,
    254,
  );
  const line = (y: number) => {
    ctx.strokeStyle = "#aaa99d";
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(115, y);
    ctx.lineTo(985, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const row = (label: string, value: string, y: number) => {
    ctx.font = "26px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#55574e";
    ctx.fillText(label, 120, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#20221d";
    ctx.fillText(value, 980, y);
  };
  const c = calculate(s);
  line(300);
  row("Участников", String(c.count), 355);
  row("Длительность", `${number(s.minutes)} мин`, 415);
  row("Встреч в месяц", number(s.meetings), 475);
  row("Рабочих часов / месяц", number(s.hours), 535);
  line(580);
  ctx.textAlign = "center";
  ctx.font = "24px IBM Plex Mono, monospace";
  ctx.fillText("ИТОГО ЗА МЕСЯЦ", 550, 645);
  const total = rub(c.monthly);
  ctx.font = `800 ${total.length > 14 ? 65 : 86}px Manrope Variable, sans-serif`;
  ctx.fillText(total, 550, 755);
  row("Одна встреча", rub(c.meeting), 835);
  row("За год", rub(c.yearly), 895);
  row("Человеко-часов / месяц", number(c.personHours, 1), 955);
  let foot = 1030;
  if (before) {
    const d = difference(before, s);
    line(1005);
    row("ДО / месяц", rub(calculate(before).monthly), 1060);
    row("ПОСЛЕ / месяц", rub(c.monthly), 1120);
    ctx.fillStyle = d.monthly.gte(0) ? "#d5f75a" : "#ffc3ae";
    ctx.fillRect(100, 1165, 900, 205);
    row(
      d.monthly.gte(0) ? "Высвобождено / месяц" : "Увеличение / месяц",
      rub(d.monthly.abs()),
      1220,
    );
    row("Эквивалент за год", rub(d.yearly.abs()), 1280);
    row(
      d.personHours.gte(0) ? "Высвобождено чел.-ч" : "Дополнительно чел.-ч",
      number(d.personHours.abs(), 1),
      1340,
    );
    foot = 1430;
  }
  line(foot);
  ctx.textAlign = "center";
  ctx.fillStyle = "#65675d";
  ctx.font = "21px IBM Plex Mono, monospace";
  [
    "Сумма зарплат ÷ рабочие часы × длительность в часах.",
    "Это стоимость времени. Встречи могут приносить пользу.",
    "Имена и персональные зарплаты в чек не включены.",
  ].forEach((t, i) => ctx.fillText(t, 550, foot + 55 + i * 37));
  ctx.fillStyle = "#20221d";
  ctx.font = "20px IBM Plex Mono, monospace";
  ctx.fillText("siblife54-dot.github.io/howmuchsozvon/", 550, foot + 205);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось создать PNG")),
      "image/png",
    ),
  );
}
