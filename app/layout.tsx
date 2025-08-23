import './globals.css'
export const metadata = {
	title: 'Antara Games',
	description: 'Talking AI that can launch games on command',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body suppressHydrationWarning>{children}</body>
		</html>
	);
}

