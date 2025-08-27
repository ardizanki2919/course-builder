import * as React from 'react'
import type { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import {
	FAQ,
	SubscribeForm,
	Testimonial,
} from '@/app/admin/pages/_components/page-builder-mdx-components'
import { CldImage, ThemeImage } from '@/components/cld-image'
import { PricingWidgetServer } from '@/components/commerce/pricing-widget-server'
import MDXVideo from '@/components/content/mdx-video'
import LayoutClient from '@/components/layout-client'
import { PrimaryNewsletterCta } from '@/components/primary-newsletter-cta'
import config from '@/config'
import { courseBuilderAdapter, db } from '@/db'
import { products } from '@/db/schema'
import { commerceEnabled } from '@/flags'
import { getPage } from '@/lib/pages-query'
import { getSaleBannerData } from '@/lib/sale-banner'
import { track } from '@/utils/analytics'
import { cn } from '@/utils/cn'
import MuxPlayer from '@mux/mux-player-react'
import { MDXRemote } from 'next-mdx-remote/rsc'

import { getCouponForCode } from '@coursebuilder/core/pricing/props-for-commerce'
import { getResourcePath } from '@coursebuilder/utils-resource/resource-paths'

import {
	Callout,
	CenteredTitle,
	CheckList,
	Instructor,
	Section,
	Spacer,
} from './admin/pages/_components/page-builder-mdx-components'

export async function generateMetadata(
	props: Props,
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const page = await getPage('root')
	const searchParams = await props.searchParams
	let ogImageUrl = config?.openGraph?.images?.[0]!.url
	const codeParam = searchParams?.code
	const couponParam = searchParams?.coupon
	const couponCodeOrId = codeParam || couponParam
	if (couponCodeOrId) {
		const coupon = await getCouponForCode(
			couponCodeOrId,
			[],
			courseBuilderAdapter,
		)
		const validCoupon = Boolean(coupon && coupon.isValid)
		if (validCoupon)
			ogImageUrl =
				'https://res.cloudinary.com/total-typescript/image/upload/v1730364326/aihero-golden-ticket_2x_qghsfq.png'
	}

	return {
		title: {
			template: '%s | Epic AI Pro',
			default: `Epic AI Pro`,
		},
		description: page?.fields?.description,
		openGraph: {
			images: [
				{
					url: ogImageUrl,
				},
			],
		},
	}
}

type Props = {
	searchParams: Promise<{ [key: string]: string | undefined }>
}

const Home = async (props: Props) => {
	const isCommerceEnabled = await commerceEnabled()
	const page = await getPage(isCommerceEnabled ? 'root-selling-live' : 'root')

	const firstPageResource = page?.resources?.[0] && {
		path: page.resources[0]?.resource?.fields?.slug,
		title: page.resources[0]?.resource?.fields?.title,
		type: page.resources[0]?.resource?.type,
		postType: page.resources[0]?.resource?.fields?.postType,
	}

	const pageVideoResource = page?.resources?.find(
		(resource) => resource.resource.type === 'videoResource',
	)

	const newContentType =
		firstPageResource && (firstPageResource.postType || firstPageResource.type)

	const searchParams = await props.searchParams
	const couponCodeOrId = searchParams?.code || searchParams?.coupon
	let validCoupon = null
	let coupon = null
	if (couponCodeOrId) {
		coupon = await getCouponForCode(couponCodeOrId, [], courseBuilderAdapter)
		if (coupon && coupon.isValid) {
			validCoupon = coupon
		}
	}

	const allProducts = await db.select().from(products)
	const productIds = allProducts.map((p) => p.id)

	let defaultCoupon = null
	if (productIds.length > 0) {
		const coupons = await courseBuilderAdapter.getDefaultCoupon(productIds)
		if (coupons?.defaultCoupon) {
			defaultCoupon = coupons.defaultCoupon
		}
	}

	const saleBannerData = await getSaleBannerData(defaultCoupon)

	return (
		<LayoutClient
			className="static"
			highlightedResource={firstPageResource}
			withContainer
		>
			<main className="flex w-full flex-col items-center justify-center">
				{defaultCoupon && saleBannerData && isCommerceEnabled ? (
					<Link
						className="text-primary dark:border-foreground/5 mx-auto flex max-w-full items-center justify-center gap-1 rounded-lg border border-violet-500/20 bg-violet-100 px-3 py-1 pr-1 text-sm font-medium shadow-md shadow-violet-600/10 dark:bg-violet-500/20 dark:shadow-none"
						href={saleBannerData.productPath}
						prefetch
					>
						<span className="font-bold">Save {saleBannerData.percentOff}%</span>{' '}
						on {saleBannerData.productName}.{' '}
						<div className="bg-linear-to-b font-heading from-primary ml-1 rounded-sm to-indigo-800 px-2 py-0.5 text-sm font-semibold text-white transition ease-out group-hover:underline">
							Get Your Ticket
						</div>
					</Link>
				) : (
					firstPageResource && (
						<Link
							className="text-primary dark:border-foreground/5 mx-auto flex max-w-full items-center justify-center gap-1 rounded-lg border border-violet-500/20 bg-violet-100 px-3 py-1 text-sm font-medium shadow-md shadow-violet-600/10 dark:bg-violet-500/20 dark:shadow-none"
							href={getResourcePath(
								firstPageResource.type,
								firstPageResource.path,
								'view',
							)}
							prefetch
						>
							<span className="truncate text-ellipsis">
								New {newContentType === 'cohort' ? 'course' : newContentType}:{' '}
								<span className="underline">{firstPageResource?.title}</span>
							</span>
						</Link>
					)
				)}
				<section
					id="home-page-video"
					className="flex w-full flex-col-reverse items-center gap-5 pb-10 pt-3 md:flex-row md:gap-10 md:pb-16 md:pt-10"
				>
					<div className="flex max-w-xl flex-col">
						<h1 className="sm:fluid-3xl fluid-2xl w-full text-center font-bold leading-tight tracking-tight md:text-left dark:text-white">
							{page?.fields?.title || 'Title'}
						</h1>
						{page?.fields?.description && (
							<h2 className="text-primary mt-3 text-center font-sans text-lg font-normal md:text-left lg:text-xl">
								{page.fields.description}
							</h2>
						)}
					</div>

					{pageVideoResource && (
						<MDXVideo
							className="mb-0 w-full max-w-full shadow-2xl shadow-violet-600/20"
							resourceId={pageVideoResource.resource.id}
							thumbnailTime={pageVideoResource.resource.fields.thumbnailTime}
							poster={pageVideoResource.resource.fields.poster}
						/>
					)}
				</section>
				<article
					className={cn(
						'prose dark:prose-invert lg:prose-xl sm:prose-lg mx-auo w-full max-w-3xl pb-10',
					)}
				>
					{page?.fields?.body ? (
						<MDXRemote
							source={page?.fields?.body}
							components={{
								CenteredTitle,
								Instructor,
								Spacer,
								Section,
								CheckList,
								Testimonial,
								Callout,
								CldImage: (props) => <CldImage {...props} />,
								SubscribeForm,
								ThemeImage: (props) => <ThemeImage {...props} />,
								PrimaryNewsletterCta: (props) => (
									<PrimaryNewsletterCta
										resource={firstPageResource}
										className={cn('not-prose pb-10 sm:pb-16', props.className)}
										trackProps={{
											event: 'subscribed',
											params: {
												location: 'home',
											},
										}}
										{...props}
									/>
								),
								Pricing: (props) => (
									<React.Suspense
										fallback={
											<div className="flex h-full w-full items-center justify-center px-5 py-10 text-center">
												Loading pricing...
											</div>
										}
									>
										<div className="bg-linear-to-bl from-primary relative mb-10 mt-24 flex w-full flex-col items-center justify-center rounded-lg to-indigo-800 py-10 shadow-lg shadow-indigo-800/5 sm:flex-row">
											<div
												id="buy"
												className="not-prose bg-card -mt-20 w-full max-w-sm rounded-lg border pt-3 shadow-[0px_4px_38px_-14px_rgba(0,_0,_0,_0.1)]"
											>
												<PricingWidgetServer
													// DEV
													productId="product-30fvh"
													// PROD
													// productId="TODO"
													searchParams={searchParams}
													{...props}
												/>
											</div>
										</div>
									</React.Suspense>
								),
								// @ts-expect-error
								MuxPlayer,
								FAQ: () => (
									<React.Suspense fallback={null}>
										<FAQ faqPageLoader={getPage('faq')} />
									</React.Suspense>
								),
								Video: ({
									resourceId,
									thumbnailTime,
									poster,
								}: {
									resourceId: string
									thumbnailTime?: number
									poster?: string
								}) => (
									<MDXVideo
										resourceId={resourceId}
										thumbnailTime={thumbnailTime}
										poster={poster}
									/>
								),
							}}
						/>
					) : (
						<p>Page body not found</p>
					)}
				</article>
			</main>
		</LayoutClient>
	)
}

export default Home
