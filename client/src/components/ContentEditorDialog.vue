<template>
  <el-dialog v-model="visible" :title="title" width="760px" @open="load">
    <el-form label-position="top">
      <el-form-item label="文本内容">
        <el-input v-model="text" type="textarea" :rows="5" placeholder="请输入内容" />
      </el-form-item>
      <el-form-item label="已有图片">
        <el-empty v-if="!images.length" description="暂无图片" />
        <div v-else class="image-grid editable-images">
          <div v-for="image in images" :key="image" class="editable-image">
            <img :src="image" alt="已上传图片" />
            <el-button size="small" type="danger" @click="removeImage(image)">删除</el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="新增图片">
        <input type="file" accept="image/*" multiple @change="onFiles" />
        <div v-if="files.length" class="file-hint">已选择 {{ files.length }} 张图片</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { api } from '../services/api';

const props = defineProps({
    modelValue: Boolean,
    type: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const text = ref('');
const images = ref([]);
const files = ref([]);
const saving = ref(false);

async function load() {
    files.value = [];
    const data = await api.getContent(props.type);
    text.value = data?.text || '';
    images.value = data?.images || [];
}

function onFiles(event) {
    files.value = Array.from(event.target.files || []);
}

async function removeImage(image) {
    try {
        await api.deleteImage(image);
        images.value = images.value.filter((item) => item !== image);
        ElMessage.success('图片已删除');
    } catch (error) {
        ElMessage.error(error.message || '删除失败');
    }
}

async function save() {
    const formData = new FormData();
    formData.append('text', text.value);
    formData.append('existingImages', JSON.stringify(images.value));
    files.value.forEach((file) => formData.append('images', file));

    saving.value = true;
    try {
        await api.saveContent(props.type, formData);
        ElMessage.success('保存成功');
        emit('saved');
        visible.value = false;
    } catch (error) {
        ElMessage.error(error.message || '保存失败');
    } finally {
        saving.value = false;
    }
}
</script>
