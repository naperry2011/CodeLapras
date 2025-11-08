# CodeLapras

> A comprehensive, offline-first business management system for inventory, sales, employee management, and more.

## Overview

**CodeLapras** is a powerful web-based business management application built entirely with vanilla JavaScript. It provides a complete solution for managing inventory, processing sales, tracking shipments, managing employees, and handling various business operations—all without requiring a backend server or internet connection.

## Features

### Core Business Functions

- **Inventory Management**
  - Product catalog with SKU tracking
  - Stock level monitoring and alerts
  - Low stock warnings and reorder points
  - Product categories and organization
  - Stock transfers between locations
  - Inventory value calculations
  - Product photo management

- **Sales & Invoicing**
  - Order creation and estimation
  - Professional invoice generation
  - Automatic invoice numbering
  - Line item management
  - Tax calculations with multiple rates
  - Print-ready invoices
  - Sales tracking and history

- **Kits & Product Bundles**
  - Create product bundles from existing items
  - Automatic cost calculations
  - Kit crafting with stock deduction
  - Component tracking

- **Rentals & Subscriptions**
  - Equipment rental management
  - Return tracking and late fees
  - Subscription billing (recurring)
  - Active/paused/cancelled status tracking

- **Employee Management**
  - Employee records and profiles
  - Hourly and salary compensation
  - Tax information (SIN/SSN)
  - Schedules and shift management
  - Timesheets with clock-in/out
  - Task assignment and tracking
  - Payroll processing
  - Pay stub and tax form generation

- **Shipment Tracking**
  - Multi-carrier support (UPS, FedEx, USPS, DHL)
  - Tracking number management
  - Automatic carrier detection
  - One-click tracking URLs

- **Calendar & Events**
  - Built-in calendar system
  - Event creation with alerts
  - Reminders and notifications
  - Date notes and recurring events

- **Reports & Analytics**
  - Business summary reports
  - Employee tax summaries
  - Inventory reports
  - Sales analytics
  - Profit tracking

### System Features

- **Multiple Themes**: Dark, Light, and High-Contrast modes
- **Customizable Interface**: Theme tokens, compact mode, tab visibility
- **Data Export/Import**: CSV and Excel support
- **Backup & Restore**: Manual and automatic backup system
- **Print Support**: Optimized layouts for invoices, receipts, and reports
- **Offline-First**: All data stored locally using browser localStorage
- **No Dependencies**: Pure vanilla JavaScript (except xlsx library for Excel)

## Technology Stack

- **Frontend**: Pure Vanilla JavaScript (ES6+)
- **Markup**: HTML5 with semantic elements
- **Styling**: CSS3 with CSS Custom Properties
- **Storage**: Browser localStorage API
- **Excel Support**: SheetJS (xlsx) library
- **Architecture**: Modular, event-driven design

## Quick Start

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd codelapras
   ```

2. **Open in browser**
   - Simply open `index.html` in any modern web browser
   - No build process or server required for development

3. **Start managing your business!**
   - All data is stored locally in your browser
   - No internet connection needed after initial load

## Browser Compatibility

CodeLapras works on all modern browsers that support:
- ES6+ JavaScript features
- CSS Custom Properties
- localStorage API
- Dialog element (or polyfill)

**Recommended browsers:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Data Privacy & Security

- **100% Local**: All data is stored in your browser's localStorage
- **No Server**: No data is transmitted to any server
- **No Tracking**: No analytics or tracking scripts
- **Privacy-First**: Your business data stays on your device

**Important**: Regular backups are highly recommended since localStorage can be cleared by the browser under certain conditions.

## Project Structure

```
codelapras/
├── src/
│   ├── styles/          # Modular CSS files
│   ├── js/
│   │   ├── core/        # Core utilities and infrastructure
│   │   ├── modules/     # Business logic modules
│   │   ├── ui/          # UI components and helpers
│   │   ├── views/       # View controllers
│   │   ├── printing/    # Print templates
│   │   └── app.js       # Main application entry
│   └── config/          # Configuration files
├── docs/                # Documentation
├── public/              # Static assets
└── index.html           # Application entry point
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[User Guide](docs/user-guide.md)** - Complete user documentation
- **[Developer Guide](docs/developer-guide.md)** - Architecture and development info
- **[API Reference](docs/api-reference.md)** - Module and function reference
- **[Architecture](docs/architecture.md)** - System design and patterns

## Development Roadmap

This project is currently being refactored from a monolithic single-file application into a modular, maintainable codebase. See `DEVELOPMENT_ROADMAP.md` for the complete 35-day refactoring plan.

**Current Phase**: Day 1 - Project Setup ✅

## Contributing

Contributions are welcome! Please read the developer guide before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For bug reports and feature requests, please open an issue on the project repository.

---

**Built with ❤️ using vanilla JavaScript**
