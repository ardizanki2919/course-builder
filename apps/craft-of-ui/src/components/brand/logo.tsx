import Image from 'next/image'
import { cn } from '@/utils/cn'

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
	return (
		<div
			className={cn(
				'text-foreground flex items-end gap-1.5 font-bold tracking-tight',
				className,
			)}
		>
			<LogoMark />
		</div>
	)
}

export const LogoMark: React.FC<{ className?: string; onDark?: boolean }> = ({
	className = 'w-8',
	onDark = false,
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={cn('h-auto', className)}
			viewBox="0 0 512 512"
			fill="none"
		>
			<path
				d="M84.5613 436.898L59.5937 471.223M54.9146 441.577L89.2403 466.544"
				stroke="currentColor"
				strokeWidth="21.2228"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M469.937 15.5007L438.936 44.4928M439.941 14.4961L468.933 45.4974"
				stroke="currentColor"
				strokeWidth="21.2228"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M82.9431 393.821L70.3031 395.363C70.9828 400.936 75.2318 405.406 80.7628 406.367L82.9431 393.821ZM437.21 89.6969L445.505 99.3587C449.068 96.2995 450.659 91.527 449.642 86.9416C448.626 82.3562 445.168 78.7025 440.646 77.4354L437.21 89.6969ZM449.994 89.5047C449.854 82.4735 444.041 76.887 437.009 77.027C429.978 77.167 424.392 82.9804 424.532 90.0117L449.994 89.5047ZM444.568 456.668L442.388 469.214C446.134 469.865 449.976 468.808 452.861 466.331C455.747 463.854 457.375 460.217 457.299 456.415L444.568 456.668ZM64.4122 241.908L56.1179 232.246C52.8875 235.019 51.2567 239.223 51.7722 243.45L64.4122 241.908ZM293.333 36.1625C286.562 34.2653 279.534 38.2169 277.637 44.9887C275.739 51.7606 279.691 58.7883 286.463 60.6856L293.333 36.1625ZM91.2374 403.483L445.505 99.3587L428.916 80.0351L74.6488 384.16L91.2374 403.483ZM424.532 90.0117L431.837 456.922L457.299 456.415L449.994 89.5047L424.532 90.0117ZM80.7628 406.367L442.388 469.214L446.748 444.123L85.1234 381.276L80.7628 406.367ZM72.7065 251.57L298.149 58.0358L281.561 38.7121L56.1179 232.246L72.7065 251.57ZM95.5831 392.28L77.0522 240.366L51.7722 243.45L70.3031 395.363L95.5831 392.28ZM440.646 77.4354L293.333 36.1625L286.463 60.6856L433.775 101.958L440.646 77.4354Z"
				fill="currentColor"
			/>
			<path
				d="M333.699 164.516L439.806 451.026"
				stroke="currentColor"
				strokeWidth="25.4674"
			/>
			<path
				d="M172.664 302.797L439.801 451.069"
				stroke="currentColor"
				strokeWidth="25.4674"
			/>
			<path
				d="M149.965 176.218C147.587 169.6 140.293 166.163 133.675 168.542C127.057 170.92 123.62 178.214 125.999 184.832L149.965 176.218ZM193.581 297.566L149.965 176.218L125.999 184.832L169.615 306.181L193.581 297.566Z"
				fill="currentColor"
			/>
			<path
				d="M331.336 173.352L222.769 116.846"
				stroke="currentColor"
				strokeWidth="25.4674"
				strokeLinecap="round"
			/>
		</svg>
	)
}
