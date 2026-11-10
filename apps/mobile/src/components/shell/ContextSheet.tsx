/**
 * ContextSheet — шит переключения контекста.
 *
 * Секции:
 * 1. «Роль» — чипы четырёх ролей; недоступные роли выключены.
 * 2. «Организация» — для store_owner и wholesale_seller обязательна;
 *    для carrier опциональна (пункт «Без организации»).
 * 3. «Точка» — только для store_owner: «Вся сеть» + точки организации.
 *
 * «Применить» записывает контекст в стор (с валидацией) и закрывает шит.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import type { ActiveContext, Role } from '@bazar/types';
import {
  Button,
  Dialog,
  Divider,
  Text,
  hapticSelection,
  useTheme,
} from '@bazar/ui';
import { useContextStore, normalizeForRole } from '../../stores/contextStore';
import {
  formatContextLabel,
  locationsForOrganization,
  organizationsForRole,
} from './contextUtils';
import { ROLE_LABEL, firstRouteFor } from './navigation';

export interface ContextSheetProps {
  visible: boolean;
  onClose: () => void;
}

const ALL_ROLES: Role[] = ['customer', 'store_owner', 'wholesale_seller', 'carrier'];

export function ContextSheet({ visible, onClose }: ContextSheetProps) {
  const active = useContextStore((s) => s.active);
  const memberships = useContextStore((s) => s.memberships);
  const setActive = useContextStore((s) => s.setActive);
  const router = useRouter();
  const { spacing } = useTheme();

  const [draft, setDraft] = useState<ActiveContext>(active);

  // При каждом открытии черновик синхронизируется с активным контекстом.
  // Осознанный синхронный setState: черновик живёт только пока шит открыт.
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация черновика
      setDraft(active);
    }
  }, [visible, active]);

  /** Роли, доступные пользователю: покупатель + роли из членств. */
  const availableRoles: Role[] = [
    'customer',
    ...ALL_ROLES.filter((r) => r !== 'customer' && memberships.some((m) => m.role === r)),
  ];

  const showOrganizations =
    draft.role === 'store_owner' || draft.role === 'wholesale_seller' || draft.role === 'carrier';
  const organizations = organizationsForRole(draft.role, memberships);
  const showLocations = draft.role === 'store_owner' && draft.organizationId !== null;
  const locations = locationsForOrganization(draft.organizationId);

  const selectRole = (role: Role) => {
    hapticSelection();
    setDraft(normalizeForRole({ ...draft, role }, memberships));
  };

  const selectOrganization = (orgId: string | null) => {
    hapticSelection();
    setDraft(normalizeForRole({ ...draft, organizationId: orgId }, memberships));
  };

  const selectLocation = (locId: string | null) => {
    hapticSelection();
    setDraft({ ...draft, locationId: locId });
  };

  const apply = () => {
    const roleChanged = draft.role !== active.role;
    setActive(draft);
    hapticSelection();
    onClose();
    // Смена роли меняет набор экранов: уходим на первый экран новой роли.
    if (roleChanged) {
      router.replace(firstRouteFor(draft.role));
    }
  };

  const sectionTitleStyle = {
    marginBottom: spacing.sm,
  };

  return (
    <Dialog visible={visible} onClose={onClose} title="Переключить контекст">
      <ScrollView bounces={false} style={{ maxHeight: 420 }}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing.md }}>
          {/* Роли */}
          <View>
            <Text variant="bodySmall" color="textSecondary" style={sectionTitleStyle}>
              Роль
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {ALL_ROLES.map((role) => {
                const enabled = availableRoles.includes(role);
                const selected = draft.role === role;
                return (
                  <RoleChip
                    key={role}
                    label={ROLE_LABEL[role]}
                    selected={selected}
                    enabled={enabled}
                    onPress={() => selectRole(role)}
                  />
                );
              })}
            </View>
          </View>

          {/* Организация */}
          {showOrganizations ? (
            <View>
              <Text variant="bodySmall" color="textSecondary" style={sectionTitleStyle}>
                Организация
              </Text>
              {draft.role === 'carrier' ? (
                <SelectRow
                  label="Без организации"
                  selected={draft.organizationId === null}
                  onPress={() => selectOrganization(null)}
                />
              ) : null}
              {organizations.map((org) => (
                <SelectRow
                  key={org.id}
                  label={org.name}
                  hint={org.kind === 'wholesale' ? 'опт' : org.kind === 'retail' ? 'розница' : 'логистика'}
                  selected={draft.organizationId === org.id}
                  onPress={() => selectOrganization(org.id)}
                />
              ))}
              {organizations.length === 0 && draft.role !== 'carrier' ? (
                <Text variant="bodySmall" color="textMuted">
                  Нет доступных организаций для этой роли.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Точка */}
          {showLocations ? (
            <View>
              <Text variant="bodySmall" color="textSecondary" style={sectionTitleStyle}>
                Торговая точка
              </Text>
              <SelectRow
                label="Вся сеть"
                selected={draft.locationId === null}
                onPress={() => selectLocation(null)}
              />
              {locations.map((loc) => (
                <SelectRow
                  key={loc.id}
                  label={loc.name}
                  hint={loc.address}
                  selected={draft.locationId === loc.id}
                  onPress={() => selectLocation(loc.id)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Divider inset="none" style={{ marginVertical: spacing.md }} />

      <Text variant="caption" color="textMuted" style={{ marginBottom: spacing.sm }}>
        Текущий выбор: {formatContextLabel(draft, memberships)}
      </Text>

      <Button variant="primary" size="md" onPress={apply}>
        Применить
      </Button>
    </Dialog>
  );
}

interface RoleChipProps {
  label: string;
  selected: boolean;
  enabled: boolean;
  onPress: () => void;
}

function RoleChip({ label, selected, enabled, onPress }: RoleChipProps) {
  const { colors, radii, spacing } = useTheme();

  const style: StyleProp<ViewStyle> = {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: enabled ? 1 : 0.4,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && enabled ? { opacity: 0.7 } : null]}
    >
      <Text variant="bodySmall" color={selected ? 'primaryText' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

interface SelectRowProps {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}

function SelectRow({ label, hint, selected, onPress }: SelectRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 48,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body" color={selected ? 'primaryText' : 'text'}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}
