// import { DeepPartial, Field } from '@directus/types';
import { defineInterface } from '@directus/extensions';
import InterfaceListO2M from './ltv-defects.vue';
import PreviewSVG from './preview.svg?raw';

export default defineInterface({
	id: 'ltv-defects',
	name: 'List of Defects',
	description: '$t:interfaces.list-o2m.description',
	icon: 'arrow_right_alt',
	component: InterfaceListO2M,
	types: ['alias'],
	localTypes: ['o2m'],
	group: 'relational',
	relational: true,
	options: ({ relations }) => {
		const collection = relations.o2m?.collection;

		return [
			{
				field: 'ltvDefectName',
				name: 'Defect Name',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: collection,
					},
					width: 'half',
				},
			},
			{
				field: 'ltvDefectLevel',
				name: 'Defect Level',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: collection,
					},
					width: 'half',
				},
			},
			{
				field: 'ltvDefectPicture',
				name: 'Defect Picture',
				meta: {
					interface: 'system-display-template',
					options: {
						collectionName: collection,
					},
					width: 'full',
				},
			},
			{
				field: 'enableCreate',
				name: '$t:creating_items',
				schema: {
					default_value: true,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:enable_create_button',
					},
					width: 'half',
				},
			},
			{
				field: 'enableSelect',
				name: '$t:selecting_items',
				schema: {
					default_value: true,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:enable_select_button',
					},
					width: 'half',
				},
			},
			{
				field: 'limit',
				name: '$t:per_page',
				type: 'integer',
				meta: {
					interface: 'input',
					width: 'half',
				},
				schema: {
					default_value: 15,
				},
			},
			{
				field: 'filter',
				name: '$t:filter',
				type: 'json',
				meta: {
					interface: 'system-filter',
					options: {
						collectionName: collection,
					},
					conditions: [
						{
							rule: {
								enableSelect: {
									_eq: false,
								},
							},
							hidden: true,
						},
					],
				},
			},
			{
				field: 'enableSearchFilter',
				name: '$t:search_filter',
				schema: {
					default_value: false,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:enable_search_filter',
					},
					width: 'half',
					hidden: true,
					conditions: [
						{
							rule: {
								layout: {
									_eq: 'table',
								},
							},
							hidden: false,
						},
					],
				},
			},
			{
				field: 'enableLink',
				name: '$t:item_link',
				schema: {
					default_value: false,
				},
				meta: {
					interface: 'boolean',
					options: {
						label: '$t:show_link_to_item',
					},
					width: 'half',
				},
			},
		];
	},
	recommendedDisplays: ['related-values'],
	preview: PreviewSVG,
});
