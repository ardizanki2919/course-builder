'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DateTimePicker } from '@/app/(content)/events/[slug]/edit/_components/date-time-picker/date-time-picker'
import { onEventSave } from '@/app/(content)/events/[slug]/edit/actions'
import StandaloneVideoResourceUploaderAndViewer from '@/app/(content)/posts/_components/standalone-video-resource-uploader-and-viewer'
import { TagField } from '@/app/(content)/posts/_components/tag-field'
import { PageBlocks } from '@/app/admin/pages/_components/page-builder-mdx-components'
import { ImageResourceUploader } from '@/components/image-uploader/image-resource-uploader'
import { useSelection } from '@/components/list-editor/selection-context'
import {
	ResourceFormProps,
	withResourceForm,
	type ResourceFormConfig,
} from '@/components/resource-form/with-resource-form'
import Spinner from '@/components/spinner'
import { env } from '@/env.mjs'
import { sendResourceChatMessage } from '@/lib/ai-chat-query'
import { EventSeriesSchema, type EventSeries } from '@/lib/events'
import { updateEvent } from '@/lib/events-query'
import { getOGImageUrlForResource } from '@/utils/get-og-image-url-for-resource'
import { EditorView } from '@codemirror/view'
import { parseAbsolute } from '@internationalized/date'
import MarkdownEditor, { ICommand } from '@uiw/react-markdown-editor'
import {
	Calendar,
	ImagePlusIcon,
	LayoutTemplate,
	Sparkles,
	VideoIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Configure } from 'react-instantsearch'
import { z } from 'zod'

import type { VideoResource } from '@coursebuilder/core/schemas'
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Textarea,
} from '@coursebuilder/ui'
import {
	CourseBuilderEditorThemeDark,
	CourseBuilderEditorThemeLight,
} from '@coursebuilder/ui/codemirror/editor'
import { useSocket } from '@coursebuilder/ui/hooks/use-socket'
import { EditResourcesMetadataFields } from '@coursebuilder/ui/resources-crud/edit-resources-metadata-fields'
import { MetadataFieldSocialImage } from '@coursebuilder/ui/resources-crud/metadata-fields/metadata-field-social-image'
import { MetadataFieldState } from '@coursebuilder/ui/resources-crud/metadata-fields/metadata-field-state'
import { MetadataFieldVisibility } from '@coursebuilder/ui/resources-crud/metadata-fields/metadata-field-visibility'

import { VideoResourceField } from './video-resource-field'

const EventResourcesTitle = () => {
	const { excludedIds } = useSelection()

	return (
		<div className="flex w-full flex-col">
			{excludedIds && excludedIds.length > 0 && (
				<div className="mb-5 border-b pb-5">
					<div className="flex items-start gap-2">
						<div className="flex-1">
							<div className="text-lg font-bold">Series Event</div>
							<div className="text-sm">
								This parent event contains {excludedIds.length} child event
								{excludedIds.length !== 1 ? 's' : ''}. Individual events remain
								accessible while this serves as the main display wrapper.
							</div>
						</div>
					</div>
				</div>
			)}
			<span className="flex text-lg font-bold">Resources</span>
			<span className="text-muted-foreground mt-2 font-normal">
				Attach other events to this event to create a series.
			</span>
		</div>
	)
}

const SearchConfig = () => {
	const { excludedIds } = useSelection()
	return (
		<Configure
			hitsPerPage={20}
			filters={`type:event ${excludedIds.length ? `&& id:!=${excludedIds.join(',')}` : ''}`}
		/>
	)
}

// Wrapper function for updateResource to match HOC's Partial<T> input and return type
async function updateEventResource(
	eventUpdate: Partial<EventSeries>,
): Promise<EventSeries> {
	// Ensure required fields are present for the original updateResource function
	// We might need the original event context here if the partial doesn't contain everything.
	// For now, let's assume the partial *should* contain enough, or the original function handles it.
	// A more robust approach might involve fetching the original event if needed.
	if (
		!eventUpdate.id ||
		!eventUpdate.type ||
		!eventUpdate.createdById ||
		!eventUpdate.fields
	) {
		// Log the problematic update object
		console.error('Update payload missing required fields:', eventUpdate)
		// Consider throwing an error or returning null/error state
		throw new Error(
			'Update payload missing required fields: id, type, createdById, fields',
		)
	}

	// Cast to the type expected by originalUpdateResource
	const updatePayload = {
		id: eventUpdate.id,
		type: eventUpdate.type,
		createdById: eventUpdate.createdById,
		fields: eventUpdate.fields,
		// Pass other fields if the original function accepts them
		...(eventUpdate.updatedAt && { updatedAt: eventUpdate.updatedAt }),
		...(eventUpdate.deletedAt && { deletedAt: eventUpdate.deletedAt }),
	}

	// Call the original imported function
	const updatedEvent = await updateEvent(updatePayload)

	// Handle null case: throw error as HOC expects a resource
	if (!updatedEvent) {
		console.error('Failed to update event, received null', { updatePayload })
		throw new Error('Failed to update event.')
	}

	return updatedEvent as EventSeries
}

// Define the configuration for the event form
const eventFormConfig: ResourceFormConfig<
	EventSeries,
	typeof EventSeriesSchema
> = {
	// Set resourceType back to 'event' as it's now a top-level type
	resourceType: 'event-series' as const,
	schema: EventSeriesSchema,
	defaultValues: (event?: EventSeries) => {
		// Explicitly define all top-level fields from ContentResourceSchema
		// and event-specific fields, providing defaults or null.
		const initialValues = {
			// Top-level fields from ContentResourceSchema
			id: event?.id || '',
			type: event?.type || 'event',
			createdById: event?.createdById || '',
			createdAt: event?.createdAt || new Date(),
			updatedAt: event?.updatedAt || new Date(),
			deletedAt: event?.deletedAt || null,
			organizationId: event?.organizationId || null,
			createdByOrganizationMembershipId:
				event?.createdByOrganizationMembershipId || null,
			currentVersionId: event?.currentVersionId || null, // Assuming null default
			resources: event?.resources || null,
			// fields needs special handling for event specifics
			fields: {
				...(event?.fields || {}), // Start with existing fields
				title: event?.fields?.title || '',
				visibility: event?.fields?.visibility || 'unlisted',
				state: event?.fields?.state || 'draft', // Default state
				image: event?.fields?.image || '',
				description: event?.fields?.description ?? '',
				slug: event?.fields?.slug ?? '',
				socialImage: event?.fields?.socialImage || {
					type: 'imageUrl',
					url: getOGImageUrlForResource(event as EventSeries),
				},
				attendeeInstructions: event?.fields?.attendeeInstructions || '',
			},
			// Handle resourceProducts (specific to EventSchema merge)
			resourceProducts: event?.resourceProducts || [],
		}

		// Refine the type for startsAt/endsAt if they exist in initialValues.fields
		// The schema expects string | null, but the initial processing might leave Date objects.
		// It's safer to handle this conversion closer to where the form uses the data, or ensure
		// EventSchema itself handles the transformation if needed.
		// For now, we assume the structure matches z.infer<typeof EventSchema>

		return initialValues as z.infer<typeof EventSeriesSchema> // Assert type compatibility
	},
	getResourcePath: (slug?: string) => `/events/${slug}`,
	// Use the wrapper function here
	updateResource: updateEventResource,
	onSave: onEventSave,
	bodyPanelConfig: {
		showListResources: true,
		listEditorConfig: {
			title: <EventResourcesTitle />,
			searchConfig: <SearchConfig />,
		},
	},
	// sendResourceChatMessage: sendResourceChatMessage,
	// hostUrl: env.NEXT_PUBLIC_PARTY_KIT_URL,
}

export function EditEventSeriesForm({
	event,
	videoResource,
}: {
	event: EventSeries
	videoResource: VideoResource | null
}) {
	const router = useRouter()

	const EventForm = withResourceForm(
		(props) => <EventFormFields {...props} videoResource={videoResource} />,
		{
			...eventFormConfig,
			onSave: async (resource, hasNewSlug) => {
				if (hasNewSlug) {
					router.push(`/events/${resource.fields?.slug}/edit`)
				}
			},
			customTools: [
				// { id: 'assistant' },
				{
					id: 'MDX Components',
					label: 'MDX Components',
					icon: () => (
						<LayoutTemplate
							strokeWidth={1.5}
							size={24}
							width={18}
							height={18}
						/>
					),
					toolComponent: (
						<div className="mt-3 px-5">
							<h3 className="mb-3 inline-flex text-xl font-bold">
								MDX Components
							</h3>
							<PageBlocks />
						</div>
					),
				},
				{
					id: 'videos',
					icon: () => (
						<VideoIcon strokeWidth={1.5} size={24} width={18} height={18} />
					),
					toolComponent: <StandaloneVideoResourceUploaderAndViewer />,
				},
				{
					id: 'media',
					label: 'Media',
					icon: () => (
						<ImagePlusIcon strokeWidth={1.5} size={24} width={18} height={18} />
					),
					toolComponent: (
						<ImageResourceUploader
							key={'image-uploader'}
							belongsToResourceId={event.id}
							uploadDirectory={`events`}
						/>
					),
				},
			],
		},
	)

	return <EventForm resource={event} />
}

// New component for the actual form fields
const EventFormFields = ({
	form,
	resource,
	videoResource,
}: ResourceFormProps<EventSeries, typeof EventSeriesSchema> & {
	videoResource: VideoResource | null
}) => {
	const { theme } = useTheme()
	const [isGeneratingDescription, setIsGeneratingDescription] =
		React.useState(false)

	useSocket({
		room: resource.id,
		host: env.NEXT_PUBLIC_PARTY_KIT_URL,
		onMessage: async (messageEvent) => {
			try {
				const data = JSON.parse(messageEvent.data)

				if (
					data.name === 'resource.chat.completed' &&
					data.requestId === resource.id &&
					data.metadata?.workflow === 'prompt-1ixsd'
				) {
					const lastMessage = data.body[data.body.length - 1]
					if (lastMessage?.content) {
						const description = lastMessage.content.replace(
							/```.*\n(.*)\n```/s,
							'$1',
						)
						form && form.setValue('fields.description', description)
					}
					setIsGeneratingDescription(false)
				}
			} catch (error) {
				setIsGeneratingDescription(false)
			}
		},
	})

	const handleGenerateDescription = async () => {
		setIsGeneratingDescription(true)

		await sendResourceChatMessage({
			resourceId: resource.id,
			messages: [
				{
					role: 'user',
					content: `Generate a SEO-friendly description for this post. The description should be under 160 characters, include relevant keywords, and be compelling for search results.`,
				},
			],
			selectedWorkflow: 'prompt-1ixsd',
		})
	}

	// Provide both generic arguments
	// Handle potential undefined form prop
	if (!form) {
		return null // Or a loading indicator
	}

	return (
		<>
			<VideoResourceField
				form={form}
				event={resource}
				videoResource={videoResource}
				initialVideoResourceId={
					form.getValues('fields.videoResourceId' as any) || null
				}
			/>
			<FormField
				control={form.control}
				name="id"
				render={({ field }) => <Input type="hidden" {...field} />}
			/>

			<FormField
				control={form.control}
				name="fields.title"
				render={({ field }) => (
					<FormItem className="px-5">
						<FormLabel className="text-lg font-bold">Title</FormLabel>
						<FormDescription>
							A title should summarize the post and explain what it is about
							clearly.
						</FormDescription>
						<Input {...field} />
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="fields.slug"
				render={({ field }) => (
					<FormItem className="px-5">
						<FormLabel className="text-lg font-bold">Slug</FormLabel>
						<FormDescription>Short with keywords is best.</FormDescription>
						<Input {...field} />
						<FormMessage />
					</FormItem>
				)}
			/>
			<MetadataFieldState form={form} />
			<MetadataFieldVisibility form={form} />
			<TagField resource={resource} showEditButton />

			<Dialog>
				<DialogTrigger asChild>
					<div className="px-5">
						<FormLabel className="inline-flex items-center text-lg font-bold">
							Attendee Instructions
						</FormLabel>
						<FormDescription>
							Instructions for attendees who have registered for this event.
							Displayed on the event page.
						</FormDescription>
						<Textarea
							readOnly
							value={form.watch('fields.attendeeInstructions') ?? ''}
						/>
					</div>
				</DialogTrigger>
				<DialogContent className="scrollbar-thin max-w-(--breakpoint-md) max-h-[500px]">
					<DialogHeader>
						<DialogTitle className="inline-flex items-center text-lg font-bold">
							Attendee Instructions
						</DialogTitle>
						<DialogDescription>
							Instructions for attendees who have registered for this event.
							Displayed on the event page. Markdown is supported.
						</DialogDescription>
					</DialogHeader>
					<FormField
						control={form.control}
						name="fields.attendeeInstructions"
						render={({ field }) => (
							<FormItem>
								<MarkdownEditor
									theme={
										(theme === 'dark'
											? CourseBuilderEditorThemeDark
											: CourseBuilderEditorThemeLight) ||
										CourseBuilderEditorThemeDark
									}
									extensions={[EditorView.lineWrapping]}
									height="300px"
									maxHeight="500px"
									onChange={(value) => {
										form.setValue('fields.attendeeInstructions', value)
									}}
									value={field.value?.toString()}
								/>

								<FormMessage />
							</FormItem>
						)}
					/>
				</DialogContent>
			</Dialog>

			<FormField
				control={form.control}
				name="fields.description"
				render={({ field }) => (
					<FormItem className="px-5">
						<div className="flex items-center justify-between">
							<FormLabel className="text-lg font-bold leading-none">
								SEO Description
								<br />
								<span className="text-muted-foreground text-sm tabular-nums">
									({`${field.value?.length ?? '0'} / 160`})
								</span>
							</FormLabel>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="flex items-center gap-1"
								disabled={isGeneratingDescription}
								onClick={handleGenerateDescription}
							>
								{isGeneratingDescription ? (
									<Spinner className="h-4 w-4" />
								) : (
									<Sparkles className="h-4 w-4" />
								)}
								Generate
							</Button>
						</div>
						<FormDescription>
							A short snippet that summarizes the post in under 160 characters.
							Keywords should be included to support SEO.
						</FormDescription>
						<Textarea rows={4} {...field} value={field.value ?? ''} />
						{field.value && field.value.length > 160 && (
							<FormMessage>
								Your description is longer than 160 characters
							</FormMessage>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
			<MetadataFieldSocialImage
				form={form}
				// Ensure form.getValues() is safe to call
				currentSocialImage={getOGImageUrlForResource(
					form.getValues() as EventSeries,
				)}
			/>
		</>
	)
}
