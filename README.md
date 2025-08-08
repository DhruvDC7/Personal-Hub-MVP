# Personal Finance Hub

A modern, responsive personal finance management application built with Next.js, Tailwind CSS, and MongoDB.

## Features

- 📊 Dashboard with net worth overview and recent transactions
- 💳 Account management (bank, wallet, investment, loan)
- 💰 Transaction tracking with categories and filters
- 📂 Document storage with file uploads
- ⚡ Fast and responsive design
- 🔒 Secure authentication (coming soon)

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Storage**: AWS S3 (for document storage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account or local MongoDB instance
- AWS S3 bucket (for document storage)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/personal-hub.git
   cd personal-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add the following environment variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   AWS_BUCKET_NAME=your_s3_bucket_name
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
src/
├── app/                    # App Router pages and layouts
│   ├── accounts/           # Accounts management
│   ├── documents/          # Document storage
│   ├── transactions/       # Transaction management
│   ├── settings/           # User settings
│   ├── layout.js           # Root layout
│   ├── page.js             # Dashboard
│   ├── loading.js          # Loading UI
│   └── error.js            # Error boundary
├── components/             # Reusable UI components
│   ├── Forms/              # Form components
│   ├── Card.js             # Card component
│   ├── Table.js            # Table component
│   ├── Modal.js            # Modal component
│   ├── Navbar.js           # Navigation bar
│   └── Toast.js            # Notification system
├── lib/                    # Utility functions
│   ├── fetcher.js          # API client
│   ├── format.js           # Formatting utilities
│   └── ui.js               # UI utilities
└── models/                 # Database models
```

## Features in Detail

### Dashboard
- Overview of your financial status
- Recent transactions
- Quick add transaction
- Net worth tracking

### Accounts
- Track multiple accounts (bank, wallet, investment, loan)
- View account balances
- Add/edit/delete accounts

### Transactions
- Record income and expenses
- Categorize transactions
- Filter by date, type, and account
- View transaction history

### Documents
- Upload and store important documents
- View and download documents
- Organize by type

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/)
