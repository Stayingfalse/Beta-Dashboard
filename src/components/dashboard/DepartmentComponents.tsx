import React from 'react';
import { Select } from '../ui';

interface Department {
    id: number;
    name: string;
}

interface DepartmentSelectProps {
    departments: Department[];
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    error?: string | null;
    label?: string;
    placeholder?: string;
}

interface DepartmentCurrentProps {
    department: Department;
    departments: Department[];
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    error?: string | null;
}

export function DepartmentSelect({
    departments,
    value,
    onChange,
    error,
    label = "Select your department:",
    placeholder = "Select department",
}: DepartmentSelectProps) {
    const options = departments.map(dept => ({
        value: dept.id.toString(),
        label: dept.name,
    }));

    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-sm rounded flex flex-col gap-2">
            <Select
                label={label}
                options={options}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                error={error}
                className="border-blue-400"
            />
        </div>
    );
}

export function DepartmentCurrent({
    department,
    departments,
    onChange,
    error,
}: DepartmentCurrentProps) {
    const options = departments.map(dept => ({
        value: dept.id.toString(),
        label: dept.name,
    }));

    return (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 text-sm rounded flex flex-col gap-2">
            <div>Your department: <span className="font-semibold">{department.name}</span></div>
            <Select
                label="Change department:"
                options={options}
                value={department.id.toString()}
                onChange={onChange}
                error={error}
                className="border-blue-400"
            />
        </div>
    );
}

export function NoDepartmentsMessage() {
    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 text-sm rounded">
            No departments are available. Please contact an administrator.
        </div>
    );
}
