<template>
  <div class="schedule-board">
    <div class="table-wrap">
      <table class="schedule-table">
        <thead>
          <tr>
            <th class="shift-col week-col">{{ displayWeekNumber }}</th>
            <th v-for="(day, dayIndex) in DAYS" :key="day.short" :class="DAY_CLASSES[dayIndex]">{{ day.full }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="area in props.schedule?.areas || []" :key="area.name">
            <tr class="area-row">
              <th class="shift-col"></th>
              <td class="area-title-cell" colspan="7">{{ area.name }}</td>
            </tr>
            <tr v-for="shift in area.shifts" :key="`${area.name}-${shift.name}`">
              <th class="shift-col">{{ shift.name }}</th>
              <td
                v-for="(day, dayIndex) in DAYS"
                :key="day.short"
                :class="[DAY_CLASSES[dayIndex], { active: isCurrent(shift.name, dayIndex), editable: props.editable }]"
                @click="$emit('cell-click', { area, shift, dayIndex })"
                @dragover.prevent
                @drop.prevent="$emit('cell-drop', { area, shift, dayIndex, event: $event })"
              >
                <div class="person-list">
                  <el-tag
                    v-for="person in splitPersons(shift.days?.[dayIndex])"
                    :key="person"
                    class="schedule-person"
                    :class="{ 'current-user-person': isCurrentUser(person) }"
                    :closable="props.editable"
                    type="primary"
                    effect="light"
                    @close.stop="$emit('remove-person', { area, shift, dayIndex, person })"
                  >
                    {{ personLabel(person, shift, dayIndex) }}
                  </el-tag>
                  <span v-if="!splitPersons(shift.days?.[dayIndex]).length && props.emptyText" class="empty-cell">{{ props.emptyText }}</span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot v-if="props.showShiftHours && shiftSummaries.length">
          <tr v-for="shift in shiftSummaries" :key="shift.name" class="shift-time-row">
            <th class="shift-col">{{ shift.name }}</th>
            <td colspan="7">{{ shift.timeText }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DAYS, SHIFT_WINDOWS, currentDayIndex, currentShift, splitPersons } from '../utils/schedule';

const props = defineProps({
    schedule: {
        type: Object,
        default: () => ({ areas: [] })
    },
    editable: {
        type: Boolean,
        default: false
    },
    emptyText: {
        type: String,
        default: '未排班'
    },
    annotationText: {
        type: String,
        default: '有批注'
    },
    showShiftHours: {
        type: Boolean,
        default: true
    },
    currentUserName: {
        type: String,
        default: ''
    }
});

defineEmits(['cell-click', 'cell-drop', 'remove-person']);

const DAY_CLASSES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const displayWeekNumber = computed(() => extractWeekNumber(props.schedule?.week));
const shiftSummaries = computed(() => {
    const seen = new Set();
    const result = [];
    props.schedule?.areas?.forEach((area) => {
        area.shifts?.forEach((shift) => {
            if (seen.has(shift.name)) {
                return;
            }
            seen.add(shift.name);
            result.push({
                name: shift.name,
                timeText: formatShiftTime(shift)
            });
        });
    });
    return result;
});

function isCurrent(shiftName, dayIndex) {
    return currentShift() === shiftName && currentDayIndex() === dayIndex;
}

function isCurrentUser(person) {
    return Boolean(props.currentUserName && person === props.currentUserName);
}

function personLabel(person, shift, dayIndex) {
    return shift.annotations?.[dayIndex] ? `${person}${props.annotationText}` : person;
}

function extractWeekNumber(title) {
    const text = String(title || '').trim();
    const match = text.match(/第[^第年月学期]+周$/);
    return match ? match[0] : (text || '周次');
}

function formatShiftTime(shift) {
    const range = SHIFT_WINDOWS[shift.name];
    if (!range) {
        return `${Number(shift.hours || 0)}小时`;
    }
    return `${formatTime(range[0])}到${formatTime(range[1])}（${Number(shift.hours || 0)}小时）`;
}

function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${toChineseHour(hour)}点${minute === 30 ? '半' : ''}`;
}

function toChineseHour(hour) {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (hour < 10) {
        return digits[hour];
    }
    if (hour === 10) {
        return '十';
    }
    if (hour < 20) {
        return `十${digits[hour % 10]}`;
    }
    const ones = hour % 10;
    return `二十${ones ? digits[ones] : ''}`;
}
</script>
