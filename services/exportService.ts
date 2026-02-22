/**
 * Utility to export data as CSV files.
 * "Minimal coding" approach for data exports.
 */
export const exportToCSV = (rows: (string | number)[][], filename: string) => {
    try {
        const csvContent = rows
            .map(row => row
                .map(value => {
                    const stringValue = String(value);
                    return `"${stringValue.replace(/"/g, '""')}"`;
                })
                .join(',')
            )
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to export CSV:', error);
    }
};
