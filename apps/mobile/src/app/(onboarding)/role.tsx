/**
 * Шаг 1 онбординга: выбор роли.
 *
 * Четыре карточки (радиогруппа): покупатель, владелец точки,
 * оптовик, перевозчик. «Продолжить» неактивен, пока роль не выбрана.
 * customer завершает онбординг сразу; бизнес-роли переходят
 * к созданию организации.
 */
import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import {
  Check,
  Package,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { Role } from '@bazar/types';
import { Button, Text, hapticSelection, useTheme } from '@bazar/ui';
import { OnboardingShell } from '../../components/onboarding/OnboardingShell';
import { useOnboardingStore } from '../../stores/onboardingStore';

interface RoleOption {
  role: Role;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ROLE_OPTIONS: readonly RoleOption[] = [
  {
    role: 'customer',
    label: 'Покупатель',
    description: 'Покупаю товары в розницу для себя и семьи',
    icon: ShoppingCart,
  },
  {
    role: 'store_owner',
    label: 'Владелец точки',
    description: 'Розничная точка: витрина, заказы покупателей, продажи',
    icon: Store,
  },
  {
    role: 'wholesale_seller',
    label: 'Оптовик',
    description: 'Оптовые продажи: каталог, клиенты-точки, отгрузки',
    icon: Package,
  },
  {
    role: 'carrier',
    label: 'Перевозчик',
    description: 'Доставка заказов между оптовиками и точками',
    icon: Truck,
  },
];

interface RoleCardProps {
  option: RoleOption;
  selected: boolean;
  onPress: () => void;
}

function RoleCard({ option, selected, onPress }: RoleCardProps) {
  const { colors, radii, spacing } = useTheme();
  const Icon = option.icon;

  const style: StyleProp<ViewStyle> = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected ? colors.primarySoft : colors.surface,
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? { opacity: 0.8 } : null]}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="body">{option.label}</Text>
        <Text variant="caption" color="textSecondary">
          {option.description}
        </Text>
      </View>
      {selected ? <Check size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

export default function OnboardingRoleScreen() {
  // Возобновление: ранее выбранная роль подсвечивается сразу.
  const [selected, setSelected] = useState<Role | null>(
    () => useOnboardingStore.getState().role,
  );
  const { spacing } = useTheme();

  const submit = () => {
    if (selected === null) {
      return;
    }
    hapticSelection();
    useOnboardingStore.getState().setRole(selected);
    router.push(selected === 'customer' ? '/done' : '/organization');
  };

  return (
    <OnboardingShell title="Ваша роль" step="role" canBack={false}>
      <View
        style={{ gap: spacing.md }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Выбор роли"
      >
        {ROLE_OPTIONS.map((option) => (
          <RoleCard
            key={option.role}
            option={option}
            selected={selected === option.role}
            onPress={() => {
              hapticSelection();
              setSelected(option.role);
            }}
          />
        ))}
      </View>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={selected === null}
        onPress={submit}
      >
        Продолжить
      </Button>
    </OnboardingShell>
  );
}
