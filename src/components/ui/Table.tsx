import React from 'react';

interface TableProps {
    headers: string[];
    children: React.ReactNode;
    className?: string;
}

interface TableRowProps {
    children: React.ReactNode;
    isEven?: boolean;
    className?: string;
}

interface TableCellProps {
    children: React.ReactNode;
    className?: string;
}

export function Table({ headers, children, className = '' }: TableProps) {
    return (
        <table className={`w-full text-xs border rounded bg-white ${className}`}>
            <thead>
                <tr className="bg-gray-200">
                    {headers.map((header, index) => (
                        <th key={index} className="p-2 font-semibold text-left">
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {children}
            </tbody>
        </table>
    );
}

export function TableRow({ children, isEven = false, className = '' }: TableRowProps) {
    return (
        <tr className={`${isEven ? 'bg-gray-50' : 'bg-white'} ${className}`}>
            {children}
        </tr>
    );
}

export function TableCell({ children, className = '' }: TableCellProps) {
    return (
        <td className={`p-2 ${className}`}>
            {children}
        </td>
    );
}
