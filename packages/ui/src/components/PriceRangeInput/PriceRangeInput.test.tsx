/**
 * Тесты PriceRangeInput: подписи, ввод цифр, отсечение не-цифр.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { PriceRangeInput } from './PriceRangeInput';

describe('PriceRangeInput', () => {
  it('показывает подпись с единицей и поля от/до', async () => {
    const screen = await render(
      <PriceRangeInput
        min=""
        max=""
        onMinChange={jest.fn()}
        onMaxChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Цена, ₽')).toBeTruthy();
    expect(screen.getByLabelText('Цена от')).toBeTruthy();
    expect(screen.getByLabelText('Цена до')).toBeTruthy();
  });

  it('ввод «от» передаётся наверх', async () => {
    const onMinChange = jest.fn();
    const screen = await render(
      <PriceRangeInput
        min=""
        max=""
        onMinChange={onMinChange}
        onMaxChange={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Цена от'), '150');
    expect(onMinChange).toHaveBeenCalledWith('150');
  });

  it('ввод «до» передаётся наверх', async () => {
    const onMaxChange = jest.fn();
    const screen = await render(
      <PriceRangeInput
        min=""
        max=""
        onMinChange={jest.fn()}
        onMaxChange={onMaxChange}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Цена до'), '300');
    expect(onMaxChange).toHaveBeenCalledWith('300');
  });

  it('не-цифровые символы отсекаются', async () => {
    const onMinChange = jest.fn();
    const screen = await render(
      <PriceRangeInput
        min=""
        max=""
        onMinChange={onMinChange}
        onMaxChange={jest.fn()}
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Цена от'), '1a5b0');
    expect(onMinChange).toHaveBeenCalledWith('150');
  });

  it('произвольная единица подставляется в подпись', async () => {
    const screen = await render(
      <PriceRangeInput
        min=""
        max=""
        onMinChange={jest.fn()}
        onMaxChange={jest.fn()}
        unit="$"
      />,
    );
    expect(screen.getByText('Цена, $')).toBeTruthy();
  });
});
