import React from 'react'
import { highlight, Pre, RawCode } from 'codehike/code'

import { cn } from '@coursebuilder/ui/utils/cn'

import { CopyButton } from './copy-button'
import { callout, diff, focus, fold, link, mark } from './handlers'

export async function Code({ codeblock }: { codeblock: RawCode }) {
	const highlighted = await highlight(codeblock, 'github-dark')
	const isTerminalCode = highlighted.lang === 'shellscript'
	return (
		<div data-pre="" className="group relative">
			{isTerminalCode && (
				<div
					aria-hidden="true"
					className="bg-background mt-8 flex items-center gap-1 rounded-t-[0.5rem] border-x border-t p-4"
				>
					<div className="h-2 w-2 rounded-full bg-gray-700" />
					<div className="h-2 w-2 rounded-full bg-gray-700" />
					<div className="h-2 w-2 rounded-full bg-gray-700" />
				</div>
			)}
			<CopyButton text={highlighted.code} />
			<Pre
				code={highlighted}
				className={cn('bg-background text-xs sm:text-sm', {
					'mt-0! rounded-t-none! rounded-b border-x border-b border-t-0':
						isTerminalCode,
				})}
				style={{
					...highlighted.style,
					padding: '1rem',
					borderRadius: '0.5rem',
				}}
				handlers={[callout, fold, mark, diff, focus, link]}
			/>
		</div>
	)
}
