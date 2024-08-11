<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { DisplayItem } from '@/composables/use-relation-multiple';
import { getAssetUrl } from '@/utils/get-asset-url';
import { readableMimeType } from '@/utils/readable-mime-type';
import { computed } from 'vue';

const props = defineProps<{
	item: DisplayItem;
	relationInfo: any;
	disabled?: boolean;
	deleteAllowed?: boolean;
	isLocalItem: (item: DisplayItem) => boolean;
	editItem: (item: DisplayItem) => void;
	deleteItem: (item: DisplayItem) => void;
}>();

const { t } = useI18n();

const getFilename = (item: Record<string, any>) => {
	const junctionField = props.relationInfo?.junctionField.field;
	if (!junctionField) return null;

	const key = item[junctionField]?.id ?? item[junctionField] ?? null;
	if (!key) return null;

	return key;
};

const getDownloadName = (item: Record<string, any>) => {
	const junctionField = props.relationInfo?.junctionField.field;
	if (!junctionField) return null;

	return item[junctionField]?.filename_download;
};

const isImage = computed(() => {
	return props.item.directus_files_id.type?.startsWith('image');
});

const ext = computed(() => {
	return props.item.directus_files_id.value?.type ? readableMimeType(props.item.value.type, true) : 'unknown';
});

const href = getAssetUrl(getFilename(props.item));
const downloadHref = getAssetUrl(getFilename(props.item), true);
const downloadName = getDownloadName(props.item);
</script>

<template>
	<v-card :class="{ deleted: item.$type === 'deleted' }" class="file-card" @click="editItem(item)">
		<div class="file-actions">
			<span class="file-title">
				{{ item[relationInfo.junctionField.field]?.title ?? item[relationInfo.junctionField.field]?.filename_download }}
			</span>
			<v-menu show-arrow placement="bottom-end">
				<template #activator="{ toggle }">
					<v-icon name="more_vert" clickable @click.stop="toggle" />
				</template>

				<v-list>
					<v-list-item v-if="!disabled && (deleteAllowed || isLocalItem(item))" clickable @click="deleteItem(item)">
						<v-list-item-icon><v-icon name="delete" /></v-list-item-icon>
						<v-list-item-content>{{ t('delete') }}</v-list-item-content>
					</v-list-item>
					<v-list-item clickable :href="href">
						<v-list-item-icon><v-icon name="launch" /></v-list-item-icon>
						<v-list-item-content>{{ t('open_file_in_tab') }}</v-list-item-content>
					</v-list-item>
					<v-list-item clickable :download="downloadName" :href="downloadHref">
						<v-list-item-icon><v-icon name="download" /></v-list-item-icon>
						<v-list-item-content>{{ t('download_file') }}</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
		</div>
		<v-image v-if="isImage" :src="href" alt="" role="presentation" class="file-image" />

		<div v-else class="fallback">
			<v-icon-file :ext="ext" />
		</div>
	</v-card>
</template>

<style scoped>
.file-card {
	position: relative;
	border: 1px solid var(--theme--divider);
	border-radius: 8px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	width: 100%; /* Ensure the card takes up full width */
	cursor: pointer;
	box-sizing: border-box; /* Ensure padding and border are included in the element's width and height */
}

.file-image {
	width: 100%;
	height: 260px;
	object-fit: cover;
}

.file-title {
	font-size: 14px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	text-align: left;
}

.file-actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16px;
}

.fallback {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 260px;
	background-color: var(--theme--surface);
}

.deleted {
	opacity: 0.5;
}

.drag-handle {
	cursor: grab;
}
</style>
