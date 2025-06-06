const config = {
	defaultTitle: `${process.env.NEXT_PUBLIC_SITE_TITLE}`,
	description: process.env.NEXT_PUBLIC_PRODUCT_DESCRIPTION,
	author: `${process.env.NEXT_PUBLIC_PARTNER_FIRST_NAME} ${process.env.NEXT_PUBLIC_PARTNER_LAST_NAME}`,
	additionalLinkTags: [
		{
			rel: 'icon',
			href: `${process.env.NEXT_PUBLIC_URL}/favicon.svg`,
		},
		{
			rel: 'mask-icon',
			href: `${process.env.NEXT_PUBLIC_URL}/favicon.svg`,
			color: '#7C3BED',
		},
		{
			rel: 'apple-touch-icon',
			href: `${process.env.NEXT_PUBLIC_URL}/apple-touch-icon.png`,
		},
	],
	additionalMetaTags: [
		{
			property: 'author',
			content: `${process.env.NEXT_PUBLIC_PARTNER_FIRST_NAME} ${process.env.NEXT_PUBLIC_PARTNER_LAST_NAME}`,
		},
		{
			property: 'keywords',
			content: process.env.NEXT_PUBLIC_SEO_KEYWORDS!,
		},
	],
	twitter: {
		cardType: 'summary_large_image',
		handle: `@${process.env.NEXT_PUBLIC_PARTNER_TWITTER}`,
	},
	bluesky: {
		handle: `@${process.env.NEXT_PUBLIC_PARTNER_BLUESKY}`,
	},
	sameAs: [`https://x.com/${process.env.NEXT_PUBLIC_PARTNER_TWITTER}`],
	openGraph: {
		type: 'website',
		site_name: process.env.NEXT_PUBLIC_SITE_TITLE,
		profile: {
			firstName: process.env.NEXT_PUBLIC_PARTNER_FIRST_NAME,
			lastName: process.env.NEXT_PUBLIC_PARTNER_LAST_NAME,
		},
		images: [
			{
				url: `https://res.cloudinary.com/epic-web/image/upload/v1744263842/epicdev.ai/card_2x.jpg`,
				width: 1200,
				height: 630,
			},
		],
	},
}

export default config
