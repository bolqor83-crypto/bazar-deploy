/**
 * Тесты PartyCard: аватар с инициалами, рейтинг, верификация.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { PartyCard, initialsOf } from './PartyCard';

describe('initialsOf', () => {
  it('два слова → две заглавные буквы', () => {
    expect(initialsOf('Иван Петров')).toBe('ИП');
  });

  it('одно слово → одна буква', () => {
    expect(initialsOf('Опт-Юг')).toBe('О');
  });

  it('лишние пробелы не мешают', () => {
    expect(initialsOf('  Сеть   «У дома»  ')).toBe('СУ');
  });
});

describe('PartyCard', () => {
  it('показывает название и вычисленные инициалы', async () => {
    const screen = await render(<PartyCard name="Опт-Юг" />);
    expect(screen.getByText('Опт-Юг')).toBeTruthy();
    expect(screen.getByText('О')).toBeTruthy();
  });

  it('явные инициалы переопределяют вычисленные', async () => {
    const screen = await render(
      <PartyCard name="Транс-Логистик" initials="ТЛ" />,
    );
    expect(screen.getByText('ТЛ')).toBeTruthy();
  });

  it('рейтинг отображается с запятой', async () => {
    const screen = await render(<PartyCard name="Опт-Юг" rating={4.75} />);
    expect(screen.getByText('4,8')).toBeTruthy();
  });

  it('без рейтинга звезда не показывается', async () => {
    const screen = await render(<PartyCard name="Опт-Юг" />);
    expect(screen.queryByText(/,/)).toBeNull();
  });

  it('подпись и нажатие работают', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <PartyCard name="Опт-Юг" subtitle="Оптовый продавец" onPress={onPress} />,
    );
    expect(screen.getByText('Оптовый продавец')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Опт-Юг/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
