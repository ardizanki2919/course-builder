import * as React from 'react'
import { NewPostInput } from '@/lib/posts'
import {
	isTopLevelResourceType,
	POST_SUBTYPES,
	supportsVideo,
} from '@/lib/resources'
import { createResourceAction } from '@/lib/resources/create-resource-action'
import { ResourceCreationError } from '@/lib/resources/resource-errors'
import { track } from '@/utils/analytics'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import { useForm, type Control } from 'react-hook-form'
import useSWR from 'swr'
import { z } from 'zod'

import {
	type ContentResource,
	type VideoResource,
} from '@coursebuilder/core/schemas'
import {
	Button,
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	useToast,
} from '@coursebuilder/ui'
import { cn } from '@coursebuilder/ui/utils/cn'

import { useResource } from '../resource-form/resource-context'
import { VideoUploadFormItem } from './video-upload-form-item'

// Author type based on what the API returns
interface Author {
	id: string
	name?: string | null
	email?: string | null
	displayName?: string
	image?: string | null
	role?: string
}

const NewResourceWithVideoSchema = z.object({
	title: z
		.string()
		.min(2, 'Title must be at least 2 characters')
		.max(90, 'Title must be less than 90 characters'),
	videoResourceId: z.string().min(4, 'Please upload a video'),
})

type NewResourceWithVideo = z.infer<typeof NewResourceWithVideoSchema>

// Improved schema for form values with better validation
const FormValuesSchema = z.object({
	title: z
		.string()
		.min(2, 'Title must be at least 2 characters')
		.max(90, 'Title must be less than 90 characters'),
	videoResourceId: z.string().optional(),
	postType: z.string().refine(
		(type) => isTopLevelResourceType(type) || POST_SUBTYPES.includes(type),
		(type) => ({
			message: `Invalid type: ${type}. Must be a valid resource type or post subtype.`,
		}),
	),
	createdById: z.string().optional(),
})

type FormValues = z.infer<typeof FormValuesSchema>

interface AuthorSelectorProps {
	control: Control<FormValues>
}

const AuthorSelector = ({ control }: AuthorSelectorProps) => {
	const fetcher = async (url: string) => {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(
				`Failed to fetch authors: ${response.status} ${response.statusText}`,
			)
		}
		return response.json()
	}

	const { data: authorsData, error: authorsError } = useSWR<{
		authors: Author[]
	}>('/api/authors', fetcher, {
		suspense: true,
	})

	const authors: Author[] = authorsData?.authors || []

	return (
		<FormField
			control={control}
			name="createdById"
			render={({ field }) => (
				<FormItem>
					<FormLabel>Author</FormLabel>
					<FormDescription>
						Select the instructor (admin or contributor) who will own this post.
					</FormDescription>
					<FormControl>
						<Select onValueChange={field.onChange} defaultValue={field.value}>
							<SelectTrigger>
								<SelectValue placeholder="Select Author..." />
							</SelectTrigger>
							<SelectContent>
								{authors.map((author) => (
									<SelectItem key={author.id} value={author.id}>
										{author.displayName ||
											author.name ||
											author.email ||
											author.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormControl>
					{authorsError && (
						<div className="text-destructive text-sm">
							Error loading authors: {authorsError.message || 'Unknown error'}
						</div>
					)}
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}

const AuthorSelectorLoading = () => {
	return (
		<FormItem>
			<FormLabel>Author</FormLabel>
			<FormDescription>
				Select the instructor (admin or contributor) who will own this post.
			</FormDescription>
			<FormControl>
				<Select disabled>
					<SelectTrigger>
						<SelectValue placeholder="Loading Authors..." />
					</SelectTrigger>
				</Select>
			</FormControl>
			<FormMessage />
		</FormItem>
	)
}

/**
 * Form for creating a new resource with an optional video attachment.
 * Supports creating both top-level resources (workshop, tutorial) and post subtypes (article, podcast).
 *
 * @param props - Component props
 * @param props.getVideoResource - Function to retrieve a video resource by ID or slug
 * @param props.createResource - Function to create a post resource
 * @param props.onResourceCreated - Callback when a resource is created
 * @param props.availableResourceTypes - List of resource types available for selection
 * @param props.defaultPostType - Default resource type to select
 * @param props.className - Additional CSS classes
 * @param props.children - Render prop for video upload UI
 * @param props.uploadEnabled - Whether video upload is enabled
 * @param props.topLevelResourceTypes - List of top-level resource types (not post subtypes)
 */
export function NewResourceWithVideoForm({
	getVideoResource,
	createResource,
	onResourceCreated,
	availableResourceTypes,
	defaultPostType = 'article',
	className,
	children,
	uploadEnabled = true,
	topLevelResourceTypes = [],
	contributorSelectable = false,
}: {
	getVideoResource: (idOrSlug?: string) => Promise<VideoResource | null>
	createResource: (values: NewPostInput) => Promise<ContentResource>
	onResourceCreated: (resource: ContentResource, title: string) => Promise<void>
	availableResourceTypes?: string[] | undefined
	defaultPostType?: string
	className?: string
	children: (
		handleSetVideoResourceId: (value: string) => void,
	) => React.ReactNode
	uploadEnabled?: boolean
	topLevelResourceTypes?: string[]
	contributorSelectable?: boolean
}) {
	const { toast } = useToast()
	const [videoResourceId, setVideoResourceId] = React.useState<
		string | undefined
	>()
	const [videoResourceValid, setVideoResourceValid] =
		React.useState<boolean>(false)
	const [isValidatingVideoResource, setIsValidatingVideoResource] =
		React.useState<boolean>(false)
	const [creationError, setCreationError] = React.useState<string | null>(null)

	// Determine admin status from prop (passed down from the server)
	const isAdmin = contributorSelectable ?? false

	// Session to determine admin permissions
	const { data: session } = useSession()

	// NOTE: We previously fetched the user's role client-side which caused UI flicker.
	// Admin status is now passed from the server via `contributorSelectable`, so we
	// no longer need to fetch `/api/role` here.

	const form = useForm<FormValues>({
		resolver: zodResolver(FormValuesSchema),
		defaultValues: {
			title: '',
			videoResourceId: undefined,
			postType: defaultPostType,
			createdById: isAdmin && session?.user?.id ? session.user.id : '',
		},
	})

	// Ensure createdById defaults after session loads
	React.useEffect(() => {
		if (isAdmin && session?.user?.id && !form.getValues('createdById')) {
			form.setValue('createdById', session.user.id)
		}
	}, [isAdmin, session?.user?.id, form])

	// Determine if current type needs video
	const selectedPostType = form.watch('postType')
	const typeSupportsVideo = React.useMemo(
		() => supportsVideo(selectedPostType),
		[selectedPostType],
	)
	const typeRequiresVideo = false

	async function* pollVideoResource(
		videoResourceId: string,
		maxAttempts = 30,
		initialDelay = 250,
		delayIncrement = 250,
	) {
		let delay = initialDelay

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const videoResource = await getVideoResource(videoResourceId)
			if (videoResource) {
				yield videoResource
				return
			}

			await new Promise((resolve) => setTimeout(resolve, delay))
			delay += delayIncrement
		}

		throw new Error('Video resource not found after maximum attempts')
	}

	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const onSubmit = async (values: FormValues) => {
		try {
			setIsSubmitting(true)
			setCreationError(null)

			// Track attempt with resource type
			track('resource_creation_attempt', {
				resourceType: selectedPostType,
				hasVideo: !!values.videoResourceId,
				isTopLevel:
					topLevelResourceTypes.includes(selectedPostType) ||
					isTopLevelResourceType(selectedPostType),
			})

			// Validate video if required
			if (typeRequiresVideo) {
				if (!values.videoResourceId) {
					const errorMsg = `A video is required for ${selectedPostType} resources`
					setCreationError(errorMsg)

					// Track validation error
					track('resource_creation_validation_error', {
						resourceType: selectedPostType,
						error: 'missing_video',
						message: `A video is required for ${selectedPostType} resources`,
					})

					setIsSubmitting(false)
					return
				}

				try {
					await pollVideoResource(values.videoResourceId).next()
				} catch (error) {
					const errorMsg = 'Video resource validation failed'
					setCreationError(errorMsg)
					console.error(errorMsg, error)

					// Track video validation error
					track('resource_creation_validation_error', {
						resourceType: selectedPostType,
						error: 'video_validation_failed',
						videoResourceId: values.videoResourceId,
					})

					setIsSubmitting(false)
					return
				}
			}

			const selectedType = values.postType
			let resource: ContentResource | null = null

			// Check if the selected type is a top-level resource type or a post subtype
			if (
				topLevelResourceTypes.includes(selectedType) ||
				isTopLevelResourceType(selectedType)
			) {
				// If it's a top-level resource type, use createResourceAction
				track('create_top_level_resource', {
					resourceType: selectedType,
					title: values.title,
					hasVideo: !!values.videoResourceId,
				})

				resource = await createResourceAction(selectedType, values.title)
			} else {
				// If it's a post subtype, use createPost
				track('create_post', {
					postType: selectedType,
					title: values.title,
					hasVideo: !!values.videoResourceId,
				})

				resource = await createResource({
					...values,
					postType: selectedType as any,
					createdById: values.createdById || '',
				})
			}

			if (!resource) {
				const errorMsg = 'Failed to create resource'
				setCreationError(errorMsg)
				console.error(
					errorMsg,
					'createResource or createResourceAction returned null',
				)

				// Track creation failure
				track('resource_creation_failed', {
					resourceType: selectedType,
					reason: 'null_resource_returned',
				})

				return
			}

			// Track successful creation
			track('resource_creation_success', {
				resourceType: selectedType,
				resourceId: resource.id,
				hasVideo: !!values.videoResourceId,
			})

			toast({
				title: 'Resource created',
				description: `Successfully created ${selectedType}: ${values.title}`,
			})

			await onResourceCreated(resource, form.watch('title'))
		} catch (error) {
			let errorMessage = 'Error creating resource'
			let errorType = 'unknown_error'
			let errorDetails = {}

			// Handle our custom error type
			if (error instanceof ResourceCreationError) {
				errorMessage = error.message
				errorType = error.type
				errorDetails = error.details || {}
			} else if (error instanceof Error) {
				errorMessage = error.message
				errorType = 'standard_error'
			}

			// Track error with detailed information
			track('resource_creation_error', {
				resourceType: selectedPostType,
				errorType,
				errorMessage,
				details: errorDetails,
			})

			console.error('Error creating resource:', { error, errorMessage })
			setCreationError(errorMessage)
			toast({
				variant: 'destructive',
				title: 'Creation failed',
				description: errorMessage,
			})
			console.error('Error creating resource:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleSetVideoResourceId(videoResourceId: string) {
		try {
			setVideoResourceId(videoResourceId)
			setIsValidatingVideoResource(true)
			form.setValue('videoResourceId', videoResourceId)
			await pollVideoResource(videoResourceId).next()

			setVideoResourceValid(true)
			setIsValidatingVideoResource(false)
		} catch (error) {
			console.error('Failed to validate video resource:', {
				videoResourceId,
				error,
			})
			setVideoResourceValid(false)
			form.setError('videoResourceId', { message: 'Video resource not found' })
			setVideoResourceId('')
			form.setValue('videoResourceId', '')
			setIsValidatingVideoResource(false)
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className={cn('flex flex-col gap-5', className)}
			>
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Title</FormLabel>
							<FormDescription>
								A title should summarize the resource and explain what it is
								about clearly.
							</FormDescription>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{availableResourceTypes && availableResourceTypes.length > 1 && (
					<FormField
						control={form.control}
						name="postType"
						render={({ field }) => {
							const descriptions: Record<string, string> = {
								lesson: 'Lessons can have solutions',
								article: 'A standard article',
								podcast:
									'A podcast episode that will be distributed across podcast networks via the egghead podcast',
								course:
									'A collection of lessons that will be distributed as a course',
								workshop: 'A comprehensive hands-on learning experience',
								tutorial: 'A step-by-step guide to completing a specific task',
								section:
									'A section can be used to organize resources in a workshop',
							}

							return (
								<FormItem>
									<FormLabel>Type</FormLabel>
									<FormDescription>
										Select the type of resource you are creating.
									</FormDescription>
									<FormControl>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<SelectTrigger className="capitalize">
												<SelectValue placeholder="Select Type..." />
											</SelectTrigger>
											<SelectContent>
												{availableResourceTypes.map((type) => (
													<SelectItem
														className="capitalize"
														value={type}
														key={type}
													>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormControl>
									{field.value && (
										<div className="text-muted-foreground w-full text-right text-sm italic">
											{descriptions[field.value] || `A ${field.value} resource`}
										</div>
									)}
									<FormMessage />
								</FormItem>
							)
						}}
					/>
				)}

				{/* Author selection for admins */}
				{isAdmin && (
					<React.Suspense fallback={<AuthorSelectorLoading />}>
						<AuthorSelector control={form.control} />
					</React.Suspense>
				)}
				{uploadEnabled && (typeRequiresVideo || typeSupportsVideo) && (
					<VideoUploadFormItem
						selectedPostType={selectedPostType}
						form={form}
						videoResourceId={videoResourceId}
						setVideoResourceId={setVideoResourceId}
						handleSetVideoResourceId={handleSetVideoResourceId}
						isValidatingVideoResource={isValidatingVideoResource}
						videoResourceValid={videoResourceValid}
					>
						{children}
					</VideoUploadFormItem>
				)}

				{creationError && (
					<div className="text-destructive mt-2 text-sm">{creationError}</div>
				)}

				<Button
					type="submit"
					variant="default"
					className="capitalize"
					disabled={
						(videoResourceId ? !videoResourceValid : typeRequiresVideo) ||
						isSubmitting
					}
				>
					{isSubmitting ? 'Creating...' : `Create ${selectedPostType}`}
				</Button>
			</form>
		</Form>
	)
}
