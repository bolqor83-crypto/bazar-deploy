/**
 * PriceRequestDialog — шит запроса цены (Промт 16, Часть C).
 *
 * Покупатель на карточке «цена по запросу»: количество
 * (QuantitySelector, минимум — минимальная партия оффера) и
 * необязательное сообщение продавцу. Только презентация:
 * отправка — колбэком onSubmit, состояние загрузки — пропом.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Input } from '../Input';
import { QuantitySelector } from '../QuantitySelector';
import { Text } from '../Text';

export interface PriceRequestDialogProps {
  visible: boolean;
  onClose: () => void;
  /** Название товара (для заголовка). */
  productName: string;
  /** Минимальная партия оффера. */
  minQuantity: number;
  /** Доступный остаток (верхняя граница количества). */
  stock: number;
  /** Начальное количество (по умолчанию minQuantity). */
  initialQuantity?: number;
  /** Отправка запроса: количество + сообщение. */
  onSubmit: (input: { quantity: number; message: string }) => void;
  /** Идёт отправка (кнопка disabled, текст «Отправляем…»). */
  submitting?: boolean;
}

export function PriceRequestDialog({
  visible,
  onClose,
  productName,
  minQuantity,
  stock,
  initialQuantity,
  onSubmit,
  submitting = false,
}: PriceRequestDialogProps) {
  const { spacing } = useTheme();
  const [quantity, setQuantity] = useState<number>(
    initialQuantity ?? minQuantity,
  );
  const [message, setMessage] = useState('');

  // Сброс полей при каждом открытии (чистый лист запроса).
  // Осознанный синхронный setState: поля живут в шите, который
  // монтируется строго при visible (паттерн Dialog).
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс формы при открытии шита
      setQuantity(initialQuantity ?? minQuantity);
      setMessage('');
    }
  }, [visible, initialQuantity, minQuantity]);

  const maxQuantity = Math.max(minQuantity, Math.min(stock, 99_999));

  return (
    <Dialog
      visible={visible}
      onClose={submitting ? () => undefined : onClose}
      dismissable={!submitting}
      title="Запросить цену"
    >
      <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
        <Text variant="body" color="textSecondary">
          {productName}: продавец ответит персональной ценой — она будет
          действовать 72 часа.
        </Text>

        <View style={{ gap: spacing.xs }}>
          <Text variant="caption" color="textMuted">
            Количество
          </Text>
          <QuantitySelector
            value={quantity}
            min={minQuantity}
            max={maxQuantity}
            onChange={setQuantity}
          />
        </View>

        <Input
          label="Сообщение продавцу (необязательно)"
          value={message}
          onChangeText={setMessage}
          placeholder="Например: нужна отгрузка до пятницы"
          multiline
          testID="price-request-message"
        />

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting}
          onPress={() => onSubmit({ quantity, message: message.trim() })}
          testID="price-request-submit"
        >
          {submitting ? 'Отправляем…' : 'Отправить запрос'}
        </Button>
      </View>
    </Dialog>
  );
}
