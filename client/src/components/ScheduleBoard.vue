<template>
  <div class="schedule-board">
    <div v-for="area in schedule?.areas || []" :key="area.name" class="area-block">
      <div class="area-title">{{ area.name }}</div>
      <div class="table-wrap">
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="shift-col">班次</th>
              <th v-for="day in DAYS" :key="day.short">{{ day.full }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shift in area.shifts" :key="`${area.name}-${shift.name}`">
              <th class="shift-col">
                <span>{{ shift.name }}</span>
                <small>{{ shift.hours }}h</small>
              </th>
              <td
                v-for="(day, dayIndex) in DAYS"
                :key="day.short"
                :class="{ active: isCurrent(shift.name, dayIndex), editable }"
                @click="$emit('cell-click', { area, shift, dayIndex })"
                @dragover.prevent
                @drop.prevent="$emit('cell-drop', { area, shift, dayIndex, event: $event })"
              >
                <div class="person-list">
                  <el-tag
                    v-for="person in splitPersons(shift.days?.[dayIndex])"
                    :key="person"
                    :closable="editable"
                    type="primary"
                    effect="light"
                    @close.stop="$emit('remove-person', { area, shift, dayIndex, person })"
                  >
                    {{ person }}
                  </el-tag>
                  <span v-if="!splitPersons(shift.days?.[dayIndex]).length" class="empty-cell">未排班</span>
                </div>
                <el-tag v-if="shift.annotations?.[dayIndex]" class="annotation" size="small" type="warning">有批注</el-tag>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { DAYS, currentDayIndex, currentShift, splitPersons } from '../utils/schedule';

defineProps({
    schedule: {
        type: Object,
        default: () => ({ areas: [] })
    },
    editable: {
        type: Boolean,
        default: false
    }
});

defineEmits(['cell-click', 'cell-drop', 'remove-person']);

function isCurrent(shiftName, dayIndex) {
    return currentShift() === shiftName && currentDayIndex() === dayIndex;
}
</script>
