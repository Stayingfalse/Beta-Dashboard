import React from 'react';
import { Table, TableRow, TableCell, Button } from '../ui';
import { LoadingMessage } from '../feedback';

interface AllocatedLink {
  id: number;
  url: string;
  times_allocated: number;
  times_purchased: number;
  error_count: number;
}

interface AllocatedLinksProps {
  links: AllocatedLink[];
  loading: boolean;
  error: string | null;
  success: string | null;
  onAllocate: (additional?: boolean) => void;
}

export function AllocatedLinksSection({
  links,
  loading,
  error,
  success,
  onAllocate,
}: AllocatedLinksProps) {
  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Your Allocated Links</h2>
      {loading ? (
        <LoadingMessage message="Loading allocated links..." />
      ) : (
        <>
          {links.length === 0 ? (
            <div className="text-gray-600 text-sm mb-2">
              You have not been allocated any links yet.
            </div>
          ) : (
            <Table headers={['Link', 'Allocated', 'Purchased', 'Errors']}>
              {links.map((link, idx) => (
                <TableRow key={link.id} isEven={idx % 2 === 0}>
                  <TableCell className="break-all">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-700 underline"
                    >
                      {link.url}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    {link.times_allocated}
                  </TableCell>
                  <TableCell className="text-center">
                    {link.times_purchased}
                  </TableCell>
                  <TableCell className="text-center">
                    {link.error_count}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
          
          <div className="flex flex-col gap-2 mt-3">
            <Button
              onClick={() => onAllocate(links.length > 0)}
              variant="success"
              className="w-full"
              disabled={loading}
            >
              {links.length === 0 ? "Get My 3 Links" : "Request 1 More Link"}
            </Button>
            {success && <div className="text-green-700 text-xs text-center">{success}</div>}
            {error && <div className="text-red-700 text-xs text-center">{error}</div>}
          </div>
        </>
      )}
    </div>
  );
}
