import { test, expect } from '@playwright/test';
import { demo, STORAGE_KEY } from '../src/model';
import path from 'node:path';
const outputs = path.resolve(process.cwd(), '../../outputs');
test.beforeEach(async ({ page }) => { await page.goto('/'); });
test('начальный расчёт, изменение зарплаты и сохранение после перезагрузки', async ({ page }) => {
  await expect(page.getByTestId('monthly-cost')).toContainText('97');
  await page.getByRole('button', { name: /Алексей · руководитель,/ }).click();
  await page.getByLabel('Зарплата в месяц, ₽').fill('200000'); await page.getByRole('button', { name: 'Сохранить участника' }).click();
  await expect(page.getByTestId('monthly-cost')).toContainText('100');
  await page.reload(); await expect(page.getByTestId('monthly-cost')).toContainText('100');
  await page.getByRole('button', { name: /Алексей · руководитель,/ }).click(); await expect(page.getByLabel('Зарплата в месяц, ₽')).toHaveValue('200000');
});
test('добавление, валидация и удаление участника, сброс', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить участника' }).click();
  await expect(page.getByRole('button', { name: 'Сохранить участника' })).toBeDisabled();
  await page.getByLabel('Имя или должность').fill('Саша · продакт'); await page.getByLabel('Зарплата в месяц, ₽').fill('80000'); await page.getByRole('button', { name: 'Сохранить участника' }).click();
  await expect(page.getByRole('button', { name: /Саша · продакт,/ })).toBeVisible();
  await page.getByRole('button', { name: /Саша · продакт,/ }).click(); await page.getByRole('button', { name: 'Удалить из команды' }).click();
  await expect(page.getByRole('button', { name: /Саша · продакт,/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Начать заново', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Начать заново', exact: true }).click(); await expect(page.getByTestId('monthly-cost')).toContainText('97');
});
test('независимость ДО/ПОСЛЕ, исключение, возврат и увеличение стоимости', async ({ page }) => {
  await page.getByRole('button', { name: /А что, если/ }).click();
  await expect(page.getByTestId('before-cost')).toHaveText(/97.*500/); await expect(page.getByTestId('after-cost')).toHaveText(/97.*500/); await expect(page.getByTestId('difference-cost')).toHaveText(/0 ₽/);
  const after = page.getByRole('article').nth(1);
  await after.getByRole('button', { name: /Алексей · руководитель,/ }).click();
  await expect(page.getByTestId('after-cost')).toHaveText(/75.*000/); await expect(page.getByTestId('before-cost')).toHaveText(/97.*500/);
  await after.getByRole('button', { name: 'Алексей', exact: true }).click(); await expect(page.getByTestId('after-cost')).toHaveText(/97.*500/);
  await after.getByRole('slider').first().fill('120'); await expect(page.getByText('СТОИМОСТЬ ВЫРОСЛА НА')).toBeVisible(); await expect(page.getByTestId('before-cost')).toHaveText(/97.*500/);
  await page.reload(); await expect(page.getByTestId('after-cost')).toHaveText(/195.*000/); await expect(page.getByTestId('before-cost')).toHaveText(/97.*500/);
  await page.getByRole('button', { name: 'Сбросить изменения' }).click(); await expect(page.getByTestId('after-cost')).toHaveText(/97.*500/);
  await after.getByRole('slider').first().fill('30'); await after.getByRole('button', { name: 'Алексей', exact: true }).click();
  await page.screenshot({ path: path.join(outputs, 'comparison-desktop.png'), fullPage: true });
});
test('PNG-чек, русский текст, копирование и отсутствие персональных данных', async ({ page }) => {
  await page.getByRole('button', { name: 'Получить счёт за совещания' }).click();
  await expect(page.getByRole('button', { name: 'Скачать PNG' })).toBeEnabled();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Скачать PNG' }).click(); const download = await downloadEvent; await download.saveAs(path.join(outputs, 'schet-za-sozvon.png'));
  await page.getByRole('button', { name: 'Копировать текст', exact: true }).click(); const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('СЧЁТ ЗА СОЗВОН'); expect(text).not.toContain('Алексей'); expect(text).not.toContain('180000');
  await page.getByRole('dialog').screenshot({ path: path.join(outputs, 'receipt-preview.png') });
});
test('адаптивность и размещение 0, 2, 6, 10, 12 участников', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const count of [0, 2, 6, 10, 12]) {
    const s = demo(); s.people = Array.from({ length: count }, (_, i) => ({ ...s.people[i % 6], id: String(i), name: `Участник ${i + 1}` }));
    await page.evaluate(({ s, key }) => localStorage.setItem(key, JSON.stringify({ version: 1, current: s, before: null, mode: 'calculate', example: false })), { s, key: STORAGE_KEY }); await page.reload();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByRole('img', { name: new RegExp(`Переговорная: ${count} участников`) })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (count === 12 && width === 390) await page.screenshot({ path: path.join(outputs, 'twelve-mobile.png'), fullPage: true });
      if (count === 6 && width === 1440) await page.screenshot({ path: path.join(outputs, 'desktop.png'), fullPage: true });
      if (count === 6 && width === 390) await page.screenshot({ path: path.join(outputs, 'mobile.png'), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});
test('пустая переговорная, нулевая частота и изменяемая норма часов', async ({ page }) => {
  await page.getByRole('slider').nth(1).fill('0'); await expect(page.getByTestId('monthly-cost')).toContainText('0');
  await page.getByRole('slider').nth(1).fill('20'); await page.getByLabel('Рабочих часов в месяц', { exact: true }).fill('80'); await expect(page.getByTestId('monthly-cost')).toContainText('195');
  await page.getByRole('button', { name: 'Команда', exact: true }).click();
  const buttons = page.getByRole('dialog').getByRole('button', { name: /^Удалить / }); while (await buttons.count()) await buttons.first().click();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click(); await expect(page.getByText('Добавьте первого участника ↓')).toBeVisible(); await expect(page.getByTestId('monthly-cost')).toContainText('0');
});
