import { describe, expect, it } from "vitest";
import { calculate, clone, demo, difference, validScenario } from "./model";
import { receiptText } from "./receipt";
describe("Расчёты стоимости рабочего времени", () => {
  it("вычисляет демонстрационный сценарий без промежуточного округления", () => {
    const c = calculate(demo());
    expect(c.meeting.toString()).toBe("4875");
    expect(c.monthly.toString()).toBe("97500");
    expect(c.yearly.toString()).toBe("1170000");
    expect(c.personHours.toString()).toBe("120");
  });
  it("вычисляет контрольный пример: двое по 80 000, 30 минут, 10 встреч", () => {
    const s = demo();
    s.people = s.people.slice(0, 2).map((p) => ({ ...p, salary: 80000 }));
    s.minutes = 30;
    s.meetings = 10;
    const c = calculate(s);
    expect(c.meeting.toString()).toBe("500");
    expect(c.monthly.toString()).toBe("5000");
    expect(c.personHours.toString()).toBe("10");
  });
  it("сохраняет копейки и дробную длительность без накопления округлений", () => {
    const s = demo();
    s.people = [{ ...s.people[0], salary: 12345.67 }];
    s.hours = 137;
    s.minutes = 17;
    s.meetings = 23;
    const c = calculate(s);
    expect(c.monthly.div(c.meeting).toNumber()).toBe(23);
    expect(c.yearly.div(c.monthly).toNumber()).toBe(12);
    expect(c.meeting.toNumber()).toBeCloseTo(((12345.67 / 137) * 17) / 60, 10);
  });
  it("не изменяет исходный сценарий и учитывает исключённых", () => {
    const before = demo(),
      after = clone(before);
    after.excluded.push(after.people[0].id);
    after.minutes = 30;
    expect(calculate(before).monthly.toString()).toBe("97500");
    expect(calculate(after).monthly.toString()).toBe("37500");
    expect(difference(before, after).monthly.toString()).toBe("60000");
    expect(difference(before, after).personHours.toString()).toBe("70");
  });
  it("показывает увеличение как отрицательную разницу", () => {
    const before = demo(),
      after = clone(before);
    after.minutes = 120;
    expect(difference(before, after).monthly.toString()).toBe("-97500");
    expect(difference(before, after).percent?.toString()).toBe("-100");
  });
  it("корректно обрабатывает пустую команду, нулевую зарплату и частоту", () => {
    const s = demo();
    s.people = [];
    expect(calculate(s).monthly.toNumber()).toBe(0);
    expect(calculate(s).personHours.toNumber()).toBe(0);
    expect(difference(s, demo()).percent).toBeNull();
    s.people = demo().people.map((p) => ({ ...p, salary: 0 }));
    expect(calculate(s).monthly.toNumber()).toBe(0);
    expect(calculate(s).personHours.toNumber()).toBe(120);
    s.meetings = 0;
    expect(calculate(s).monthly.toNumber()).toBe(0);
    expect(calculate(s).personHours.toNumber()).toBe(0);
  });
  it("отвергает повреждённое сохранение и недопустимые значения", () => {
    expect(validScenario(demo())).toBe(true);
    for (const patch of [
      { hours: 0 },
      { minutes: Infinity },
      { meetings: -1 },
      { people: [{ id: "a", name: "", salary: -1, color: 0 }] },
      { excluded: ["missing"] },
    ])
      expect(validScenario({ ...demo(), ...patch })).toBe(false);
  });
  it("не включает имена и персональные зарплаты в публичный чек", () => {
    const s = demo();
    s.people[0].name = "Секретное Имя";
    s.people[0].salary = 123456.78;
    const text = receiptText(s, clone(s));
    expect(text).not.toContain("Секретное");
    expect(text).not.toContain("123456");
    expect(text).toContain("ДО / месяц");
    expect(text).toContain("ПОСЛЕ / месяц");
  });
});
