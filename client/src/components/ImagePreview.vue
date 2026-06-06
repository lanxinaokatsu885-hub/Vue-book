<template>
  <el-dialog v-model="visible" class="image-preview-dialog" width="min(920px, 92vw)" append-to-body>
    <img v-if="src" :src="src" alt="图片预览" class="preview-image" />
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: Boolean,
    src: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:modelValue']);

const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});
</script>
