<script setup lang="ts">
import { Sort } from '@/components/v-table/types';
import { DisplayItem, RelationQueryMultiple, useRelationMultiple } from '@/composables/use-relation-multiple';
import { useRelationO2M } from '@/composables/use-relation-o2m';
import { useRelationPermissionsO2M } from '@/composables/use-relation-permissions';
import { addRelatedPrimaryKeyToFields } from '@/utils/add-related-primary-key-to-fields';
import { getItemRoute } from '@/utils/get-route';
import { parseFilter } from '@/utils/parse-filter';
import DrawerCollection from '@/views/private/components/drawer-collection.vue';
import DrawerItem from '@/views/private/components/drawer-item.vue';
import { Filter } from '@directus/types';
import { deepMap, getFieldsFromTemplate } from '@directus/utils';
import { clamp, get, isEmpty, isNil } from 'lodash';
import { render } from 'micromustache';
import { computed, inject, ref, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Draggable from 'vuedraggable';
import DefectFileCard from './defect-card.vue';

const props = withDefaults(
	defineProps<{
		value?: (number | string | Record<string, any>)[] | Record<string, any>;
		primaryKey: string | number;
		collection: string;
		field: string;
		width: string;
		tableSpacing?: 'compact' | 'cozy' | 'comfortable';
		fields?: Array<string>;
		ltvDefectName?: string;
		ltvDefectLevel?: string;
		ltvDefectPicture?: string;
		template?: string | null;
		disabled?: boolean;
		enableCreate?: boolean;
		enableSelect?: boolean;
		filter?: Filter | null;
		enableSearchFilter?: boolean;
		enableLink?: boolean;
		limit?: number;
	}>(),
	{
		value: () => [],
		// layout: DEFECT_LAYOUTS.LIST,
		tableSpacing: 'cozy',
		fields: () => ['id'],
		ltvDefectName: undefined,
		ltvDefectLevel: undefined,
		ltvDefectPicture: undefined,
		template: null,
		disabled: false,
		enableCreate: true,
		enableSelect: true,
		filter: null,
		enableSearchFilter: false,
		enableLink: false,
		limit: 15,
	},
);

const emit = defineEmits(['input']);
const { t } = useI18n();
const { collection, field, primaryKey } = toRefs(props);

const { relationInfo } = useRelationO2M(collection, field);

const value = computed({
	get: () => props.value,
	set: (val) => {
		emit('input', val);
	},
});

const ltvDefectNameTemplate = computed(() => {
	return (
		props.ltvDefectName ||
		relationInfo.value?.relatedCollection.meta?.display_template ||
		`{{${relationInfo.value?.relatedPrimaryKeyField.field}}}`
	);
});

const ltvDefectLevelTemplate = computed(() => {
	return (
		props.ltvDefectLevel ||
		relationInfo.value?.relatedCollection.meta?.display_template ||
		`{{${relationInfo.value?.relatedPrimaryKeyField.field}}}`
	);
});

const limit = ref(props.limit);
const page = ref(1);
const search = ref('');
const searchFilter = ref<Filter>();
const sort = ref<Sort>();

const fields = computed(() => {
	if (!relationInfo.value) return [];

	const displayFields: string[] = getFieldsFromTemplate(
		`{{ id }} ${props.ltvDefectName} ${props.ltvDefectLevel} ${props.ltvDefectPicture} {{ category }} {{ type }} {{ comment }}`,
	);

	// displayFields.push('defect_files.directus_files_id.id');
	// displayFields.push('defect_files.directus_files_id.type');
	// displayFields.push('defect_files.directus_files_id.title');

	// displayFields.push('picture.directus_files_id.id');
	// displayFields.push('picture.directus_files_id.type');
	// displayFields.push('picture.directus_files_id.title');

	return addRelatedPrimaryKeyToFields(relationInfo.value.relatedCollection.collection, displayFields);
});

const query = computed<RelationQueryMultiple>(() => {
	const q: RelationQueryMultiple = {
		limit: limit.value,
		page: page.value,
		fields: fields.value,
	};

	if (!relationInfo.value) {
		return q;
	}

	if (searchFilter.value) {
		q.filter = searchFilter.value;
	}

	if (search.value) {
		q.search = search.value;
	}

	if (sort.value) {
		q.sort = [`${sort.value.desc ? '-' : ''}${sort.value.by}`];
	}

	return q;
});

watch([search, searchFilter, limit], () => {
	page.value = 1;
});

const {
	create,
	update,
	remove,
	select,
	displayItems,
	totalItemCount,
	loading,
	selected,
	isItemSelected,
	isLocalItem,
	getItemEdits,
} = useRelationMultiple(value, query, relationInfo, primaryKey);

const { createAllowed, deleteAllowed, updateAllowed } = useRelationPermissionsO2M(relationInfo);

const pageCount = computed(() => Math.ceil(totalItemCount.value / limit.value));

// const headers = ref<Array<any>>([]);

const allowDrag = computed(
	() => totalItemCount.value <= limit.value && relationInfo.value?.sortField !== undefined && !props.disabled,
);

function getDeselectIcon(item: DisplayItem) {
	if (item.$type === 'deleted') return 'settings_backup_restore';
	if (isLocalItem(item)) return 'delete';
	return 'close';
}

function getDeselectTooltip(item: DisplayItem) {
	if (item.$type === 'deleted') return 'undo_removed_item';
	if (isLocalItem(item)) return 'delete_item';
	return 'remove_item';
}

function sortItems(items: DisplayItem[]) {
	const info = relationInfo.value;
	const sortField = info?.sortField;
	if (!info || !sortField) return;

	const sortedItems = items.map((item, index) => {
		const relatedId = item?.[info.relatedPrimaryKeyField.field];

		const changes: Record<string, any> = {
			$index: item.$index,
			$type: item.$type,
			$edits: item.$edits,
			...getItemEdits(item),
			[sortField]: index + 1,
		};

		if (!isNil(relatedId)) {
			changes[info.relatedPrimaryKeyField.field] = relatedId;
		}

		return changes;
	});

	update(...sortedItems);
}

const selectedPrimaryKeys = computed(() => {
	if (!relationInfo.value) return [];

	const relatedPkField = relationInfo.value.relatedPrimaryKeyField.field;

	return selected.value.map((item) => item[relatedPkField]);
});

const currentlyEditing = ref<string | null>(null);
const selectModalActive = ref(false);
const editsAtStart = ref<Record<string, any>>({});
let newItem = false;

function createItem() {
	currentlyEditing.value = '+';
	editsAtStart.value = {};
	newItem = true;
}

function editItem(item: DisplayItem) {
	if (!relationInfo.value) return;

	const relatedPkField = relationInfo.value.relatedPrimaryKeyField.field;

	newItem = false;
	editsAtStart.value = getItemEdits(item);

	if (item?.$type === 'created' && !isItemSelected(item)) {
		currentlyEditing.value = '+';
	} else {
		currentlyEditing.value = item[relatedPkField];
	}
}

function stageEdits(item: Record<string, any>) {
	if (newItem) {
		create(item);
	} else {
		update(item);
	}
}

function cancelEdit() {
	currentlyEditing.value = null;
}

function deleteItem(item: DisplayItem) {
	if (
		page.value === Math.ceil(totalItemCount.value / limit.value) &&
		page.value !== Math.ceil((totalItemCount.value - 1) / limit.value)
	) {
		page.value = Math.max(1, page.value - 1);
	}

	remove(item);
}

const values = inject('values', ref<Record<string, any>>({}));

const customFilter = computed(() => {
	const filter: Filter = {
		_and: [],
	};

	const customFilter = parseFilter(
		deepMap(props.filter, (val: any) => {
			if (val && typeof val === 'string') {
				return render(val, values.value);
			}

			return val;
		}),
	);

	if (!isEmpty(customFilter)) filter._and.push(customFilter);

	if (!relationInfo.value) return filter;

	const selectFilter: Filter = {
		_or: [
			{
				[relationInfo.value.reverseJunctionField.field]: {
					_neq: props.primaryKey,
				},
			},
			{
				[relationInfo.value.reverseJunctionField.field]: {
					_null: true,
				},
			},
		],
	};

	if (selectedPrimaryKeys.value.length > 0) {
		filter._and.push({
			[relationInfo.value.relatedPrimaryKeyField.field]: {
				_nin: selectedPrimaryKeys.value,
			},
		});
	}

	if (props.primaryKey !== '+') filter._and.push(selectFilter);

	return filter;
});

function getLinkForItem(item: DisplayItem) {
	if (relationInfo.value) {
		const primaryKey = get(item, relationInfo.value.relatedPrimaryKeyField.field);

		return getItemRoute(relationInfo.value.relatedCollection.collection, primaryKey);
	}

	return null;
}

// const href = getAssetUrl(props.value.picture);
</script>

<template>
	<v-notice v-if="!relationInfo" type="warning">
		{{ t('relationship_not_setup') }}
	</v-notice>
	<v-notice v-else-if="relationInfo.relatedCollection.meta?.singleton" type="warning">
		{{ t('no_singleton_relations') }}
	</v-notice>
	<div v-else class="one-to-many">
		<div>
			<template v-if="loading">
				<v-skeleton-loader v-for="n in clamp(totalItemCount - (page - 1) * limit, 1, limit)" :key="n" :type="card" />
			</template>

			<template v-else>
				<v-notice v-if="displayItems.length === 0">
					{{ t('no_items') }}
				</v-notice>

				<draggable
					class="card-grid"
					:model-value="displayItems"
					tag="div"
					item-key="element?.id || element?.primaryKey || Math.random()"
					handle=".drag-handle"
					:disabled="!allowDrag"
					v-bind="{ 'force-fallback': true }"
					@update:model-value="sortItems($event)"
				>
					<template #item="{ element }">
						<v-card class="card-item" @click="editItem(element)" :class="{ deleted: element?.$type === 'deleted' }">
							<v-icon v-if="allowDrag" name="drag_handle" class="drag-handle" left @click.stop="() => {}" />

							<div class="card-header">
								<v-card-title class="card-name">
									<render-template
										:collection="relationInfo.relatedCollection.collection"
										:item="element"
										:template="ltvDefectNameTemplate"
									/>
								</v-card-title>

								<v-card-title>
									<render-template
										:collection="relationInfo.relatedCollection.collection"
										:item="element"
										:template="ltvDefectLevelTemplate"
									/>
									<v-icon
										v-if="!disabled && (deleteAllowed || isLocalItem(element))"
										v-tooltip="t(getDeselectTooltip(element))"
										class="deselect"
										:name="getDeselectIcon(element)"
										@click.stop="deleteItem(element)"
									/>
								</v-card-title>
							</div>

							<div class="card-header">
								<v-card-subtitle>Comment: {{ element.comment }}</v-card-subtitle>
							</div>

							<v-card-subtitle>Category: {{ element.category }}</v-card-subtitle>
							<v-card-subtitle>Type: {{ element.type }}</v-card-subtitle>

							<div class="spacer" />

							<DefectFileCard
								:item="element"
								:disabled="disabled"
								:delete-allowed="deleteAllowed"
								:is-local-item="isLocalItem"
								:edit-item="editItem"
								:delete-item="deleteItem"
							/>

							<!-- <div v-for="image in element.defect_files" :key="image.id" class="card-grid">
								<DefectFileCard
									:item="image"
									:disabled="disabled"
									:delete-allowed="deleteAllowed"
									:is-local-item="isLocalItem"
									:edit-item="editItem"
									:delete-item="deleteItem"
								/>
							</div> -->

							<router-link
								v-if="enableLink"
								v-tooltip="t('navigate_to_item')"
								:to="getLinkForItem(element)!"
								class="item-link"
								:class="{ disabled: element?.$type === 'created' }"
								@click.stop
							>
								<v-icon name="launch" />
							</router-link>
						</v-card>
					</template>
				</draggable>
			</template>

			<div class="actions">
				<v-button v-if="enableCreate && createAllowed" :disabled="disabled" @click="createItem">
					{{ t('create_new') }}
				</v-button>
				<v-button v-if="enableSelect && updateAllowed" :disabled="disabled" @click="selectModalActive = true">
					{{ t('add_existing') }}
				</v-button>
				<div class="spacer" />
				<v-pagination v-if="pageCount > 1" v-model="page" :length="pageCount" :total-visible="2" show-first-last />
			</div>
		</div>

		<drawer-item
			:disabled="disabled || (!updateAllowed && currentlyEditing !== '+')"
			:active="currentlyEditing !== null"
			:collection="relationInfo?.relatedCollection?.collection || ''"
			:primary-key="currentlyEditing || '+'"
			:edits="editsAtStart"
			:circular-field="relationInfo?.reverseJunctionField?.field || ''"
			@input="stageEdits"
			@update:active="cancelEdit"
		/>

		<drawer-collection
			v-if="!disabled"
			v-model:active="selectModalActive"
			:collection="relationInfo?.relatedCollection?.collection || ''"
			:filter="customFilter"
			multiple
			@input="select"
		/>
	</div>
</template>

<style lang="scss">
.one-to-many {
	.card-grid {
		gap: 16px;
		margin: 8px 0px 16px 0px;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.card-item {
		width: 100%; /* Ensure the card takes full width */

		box-sizing: border-box; /* Include padding and border in the element's width */
		padding: 4px;
		border: 1px solid var(--theme--border-color);
		border-radius: 8px;
		transition: box-shadow 0.2s;

		&:hover {
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		}

		&.deleted {
			background-color: var(--danger-10);
			border-color: var(--danger-25);

			::v-deep(.v-icon) {
				color: var(--danger-75);
			}
		}
	}

	.card-header {
		display: flex;
		align-items: center; /* Aligns items vertically */
		justify-content: space-between; /* Optional: Adjusts spacing between title and subtitle */
		gap: 8px; /* Optional: Adds spacing between title and subtitle */
		text-align: center;
	}

	.card-name {
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;

		.v-pagination {
			margin-left: auto;
			:deep(.v-button) {
				display: inline-flex;
			}
		}

		.spacer {
			flex-grow: 1;
		}

		.search {
			position: relative;
			z-index: 1;
			align-self: stretch;

			:deep(.search-input) {
				height: 100%;
				box-sizing: border-box;
			}

			:deep(.search-badge) {
				height: 100%;
			}
		}

		.item-count {
			color: var(--theme--form--field--input--foreground-subdued);
			white-space: nowrap;
		}

		&.half,
		&.half-right {
			flex-wrap: wrap;

			.search {
				width: 100%;
				order: -1;

				:deep(.search-input),
				:deep(.search-badge) {
					width: 100% !important;
				}
			}
		}

		&.list {
			margin-top: 8px;
		}
	}

	.item-link {
		--v-icon-color: var(--theme--form--field--input--foreground-subdued);
		transition: color var(--fast) var(--transition);
		margin: 0 4px;

		&:hover {
			--v-icon-color: var(--theme--primary);
		}

		&.disabled {
			opacity: 0;
			pointer-events: none;
		}
	}

	.deselect {
		--v-icon-color: var(--theme--form--field--input--foreground-subdued);
		transition: color var(--fast) var(--transition);
		margin: 0 4px;

		&:hover {
			--v-icon-color: var(--theme--danger);
		}
	}

	.per-page {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		width: 120px;
		padding: 10px 0;
		margin-right: 2px;
		color: var(--theme--form--field--input--foreground-subdued);

		span {
			width: auto;
			margin-right: 8px;
		}

		.v-select {
			color: var(--theme--form--field--input--foreground);
		}
	}
}
</style>
