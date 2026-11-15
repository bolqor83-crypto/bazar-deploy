/**
 * Блок «Доставка» в карточке заказа (Промт 10, Часть D).
 *
 * По подтверждённому заказу (CONFIRMED/PREPARING/READY) без
 * доставки — кнопка «Заказать доставку» и раскрывающаяся форма:
 * адреса и контакты забора/выгрузки, вес, объём, примечание.
 * Есть доставка — карточка доставки со статусом и ссылкой на
 * детали. Единый блок для покупателя и продавца.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { DeliveryBrief } from '@bazar/types';
import {
  Button,
  Card,
  DeliveryCard,
  Input,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import { useCreateDelivery } from '../../hooks/useDeliveries';

/** Статусы заказа, в которых доступно создание заявки. */
const ORDER_STATUSES_ALLOWED = new Set(['CONFIRMED', 'PREPARING', 'READY']);

export interface OrderDeliveryBlockProps {
  orderId: string;
  orderStatus: string;
  delivery: DeliveryBrief | null;
  /** Префикс маршрута деталей: customer | wholesale. */
  basePath: 'customer' | 'wholesale';
}

/** Строка формы. */
function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  numeric?: boolean;
}) {
  return (
    <Input
      label={props.label}
      value={props.value}
      onChangeText={props.onChange}
      hint={props.hint}
      keyboardType={props.numeric ? 'numeric' : 'default'}
      accessibilityLabel={props.label}
    />
  );
}

/** Цвет вторичного текста для иконки-стрелки. */
function useChevronColor(): string {
  const { colors } = useTheme();
  return colors.textMuted;
}

export function OrderDeliveryBlock({
  orderId,
  orderStatus,
  delivery,
  basePath,
}: OrderDeliveryBlockProps) {
  const router = useRouter();
  const { spacing } = useTheme();
  const chevronColor = useChevronColor();
  const { show } = useToast();
  const create = useCreateDelivery();
  const [formOpen, setFormOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupContact, setPickupContact] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffContact, setDropoffContact] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [notes, setNotes] = useState('');

  // Есть доставка — карточка со ссылкой на детали.
  if (delivery) {
    return (
      <Card>
        <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
          Доставка
        </Text>
        <DeliveryCard
          method="delivery"
          title={`Доставка ${delivery.number}`}
          address={delivery.dropoffAddress}
          priceKopecks={delivery.price}
          selected
          onPress={() => router.push(`/${basePath}/deliveries/${delivery.id}`)}
        />
        {delivery.carrierName ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 32,
              marginTop: spacing.xs,
            }}
          >
            <Text variant="caption" color="textSecondary">
              Перевозчик
            </Text>
            <Text variant="caption">{delivery.carrierName}</Text>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            minHeight: 32,
            marginTop: spacing.xs,
          }}
        >
          <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
            Подробности маршрута и статусы рейса
          </Text>
          <ChevronRight size={18} color={chevronColor} />
        </View>
      </Card>
    );
  }

  // Заказ не в стадии, когда доставка доступна.
  if (!ORDER_STATUSES_ALLOWED.has(orderStatus)) {
    if (orderStatus === 'PENDING') {
      return (
        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
            Доставка
          </Text>
          <Text variant="body" color="textSecondary">
            Станет доступна, когда продавец подтвердит заказ.
          </Text>
        </Card>
      );
    }
    return null;
  }

  const submit = () => {
    const weightNum = Number.parseFloat(weight.replace(',', '.'));
    const volumeNum = Number.parseFloat(volume.replace(',', '.'));
    create.mutate(
      {
        orderId,
        pickupAddress: pickupAddress.trim(),
        pickupContact: pickupContact.trim(),
        dropoffAddress: dropoffAddress.trim(),
        dropoffContact: dropoffContact.trim(),
        weightKg:
          weight.trim().length > 0 &&
          Number.isFinite(weightNum) &&
          weightNum > 0
            ? weightNum
            : undefined,
        volumeL:
          volume.trim().length > 0 &&
          Number.isFinite(volumeNum) &&
          volumeNum > 0
            ? volumeNum
            : undefined,
        cargoNotes: notes.trim().length > 0 ? notes.trim() : undefined,
      },
      {
        onSuccess: () => {
          setFormOpen(false);
          show({
            variant: 'success',
            message: 'Заявка на доставку создана — ищем перевозчика',
          });
        },
        onError: () =>
          show({
            variant: 'error',
            message: 'Не получилось создать заявку. Проверьте поля и связь',
          }),
      },
    );
  };

  const formValid =
    pickupAddress.trim().length > 0 &&
    pickupContact.trim().length > 0 &&
    dropoffAddress.trim().length > 0 &&
    dropoffContact.trim().length > 0;

  return (
    <Card>
      <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
        Доставка
      </Text>
      {formOpen ? (
        <View style={{ gap: spacing.sm }}>
          <Field
            label="Адрес забора"
            value={pickupAddress}
            onChange={setPickupAddress}
            hint="Откуда забрать груз, например: База Опт-Юг, ул. Шоссейная, 4"
          />
          <Field
            label="Контакт на заборе"
            value={pickupContact}
            onChange={setPickupContact}
            hint="Имя и телефон, например: Пётр, +7 900 555-01-01"
          />
          <Field
            label="Адрес выгрузки"
            value={dropoffAddress}
            onChange={setDropoffAddress}
          />
          <Field
            label="Контакт на выгрузке"
            value={dropoffContact}
            onChange={setDropoffContact}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Вес, кг"
                value={weight}
                onChange={setWeight}
                numeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Объём, л"
                value={volume}
                onChange={setVolume}
                numeric
              />
            </View>
          </View>
          <Field
            label="Примечание к грузу"
            value={notes}
            onChange={setNotes}
            hint="Необязательно: ящики, хрупкое, погрузка нужна"
          />
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!formValid}
            loading={create.isPending}
            onPress={submit}
            testID="order-delivery-submit"
          >
            Отправить заявку
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setFormOpen(false)}
          >
            Свернуть
          </Button>
        </View>
      ) : (
        <>
          <Text
            variant="body"
            color="textSecondary"
            style={{ marginBottom: spacing.sm }}
          >
            Груз отвезёт перевозчик: оформите заявку — её увидят транспортные
            компании в ленте.
          </Text>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => setFormOpen(true)}
            testID="order-delivery-create"
          >
            Заказать доставку
          </Button>
        </>
      )}
    </Card>
  );
}
