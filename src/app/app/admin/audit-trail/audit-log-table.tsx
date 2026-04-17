
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import type { AuditLog, User } from "@/lib/types";
import { utils, writeFile } from 'xlsx';
import { getUsers } from "@/services/user-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type SortConfig = {
  key: keyof AuditLog | null;
  direction: "ascending" | "descending";
};

const ALL_ACTION_TYPES = [
    'auth',
    'user',
    'resource',
    'rate',
    'deal',
    'itinerary',
    'property',
    'parkFee',
    'howToGetThere',
    'training',
    'settings',
];


const RenderDetails = ({ details }: { details: any }) => {
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-muted-foreground italic text-xs">No details available</span>;
  }

  const formatValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "object") {
        return (
            <pre className="text-[10px] bg-muted p-1 rounded mt-1 overflow-x-auto max-w-full">
                {JSON.stringify(val, null, 2)}
            </pre>
        );
    }
    return String(val);
  };

  const entries = Object.entries(details);
  const displayEntries = entries.slice(0, 4); // Show first 4 entries inline
  const hasMore = entries.length > 4;

  return (
    <div className="space-y-1.5 py-1">
      {displayEntries.map(([key, value]) => {
        // Skip internal IDs if they are redundant with titles
        if (key.toLowerCase().includes('id') && entries.some(([k]) => k.toLowerCase().includes('title') || k.toLowerCase().includes('name'))) {
            if (entries.length > 1) return null;
        }

        if (key === 'changes' && typeof value === 'object' && value !== null) {
            const changes = Object.entries(value);
            return (
                <div key={key} className="text-xs border-t pt-1 mt-1">
                    <span className="font-semibold block mb-1 text-primary/80">Changes:</span>
                    <div className="pl-2 border-l-2 border-muted space-y-1">
                        {changes.slice(0, 3).map(([cKey, cVal]) => (
                            <div key={cKey} className="flex gap-2">
                                <span className="font-medium shrink-0 capitalize text-foreground/70">{cKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:</span>
                                <span className="text-muted-foreground truncate max-w-[150px]">{String(cVal)}</span>
                            </div>
                        ))}
                        {changes.length > 3 && <span className="text-[10px] text-muted-foreground italic">+{changes.length - 3} more changes...</span>}
                    </div>
                </div>
            )
        }

        return (
          <div key={key} className="text-xs flex gap-2 items-start">
            <span className="font-semibold shrink-0 capitalize text-foreground/80 min-w-[80px]">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}:
            </span>
            <span className="text-muted-foreground truncate max-w-[200px]" title={String(value)}>
              {String(value)}
            </span>
          </div>
        );
      })}
      {hasMore && (
        <div className="text-[10px] text-muted-foreground italic pt-1">
            +{entries.length - displayEntries.length} more fields...
        </div>
      )}
    </div>
  );
};

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [textFilter, setTextFilter] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState<string>('all');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: "timestamp", direction: "descending" });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(20);

  React.useEffect(() => {
    getUsers().then(setAllUsers);
  }, []);

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const textMatch = log.userName.toLowerCase().includes(textFilter.toLowerCase()) ||
                        log.action.toLowerCase().includes(textFilter.toLowerCase());
      const actionMatch = actionFilter === 'all' || log.action.startsWith(actionFilter);
      return textMatch && actionMatch;
    });
  }, [logs, textFilter, actionFilter]);

  const sortedLogs = React.useMemo(() => {
    let sortableItems = [...filteredLogs];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredLogs, sortConfig]);

  const paginatedLogs = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);

  const requestSort = (key: keyof AuditLog) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  
  const handleExport = (format: 'csv' | 'xlsx') => {
    // Use the full sortedLogs array, not the paginated one
    const dataToExport = sortedLogs.map(log => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      User: log.userName,
      Action: log.action,
      Status: log.status,
      Details: JSON.stringify(log.details)
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "AuditLogs");
    const fileName = `audit_log_export.${format}`;
    writeFile(workbook, fileName);
  };

  const SortableHeader = ({ tKey, label }: { tKey: keyof AuditLog, label: string }) => (
    <TableHead 
      className="text-primary-foreground font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
      onClick={() => requestSort(tKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className="h-4 w-4 ml-2" />
      </div>
    </TableHead>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center flex-wrap gap-4 py-4">
        <Input
          placeholder="Filter by user or action..."
          value={textFilter}
          onChange={(event) => setTextFilter(event.target.value)}
          className="w-full sm:w-auto sm:max-w-xs"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Action Types</SelectItem>
            {ALL_ACTION_TYPES.map(action => <SelectItem key={action} value={action} className="capitalize">{action}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
            <Button onClick={() => handleExport('csv')}>
                <Download className="mr-2"/>
                Export CSV
            </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary hover:bg-primary">
              <SortableHeader tKey="timestamp" label="Timestamp" />
              <SortableHeader tKey="userName" label="User" />
              <SortableHeader tKey="action" label="Action" />
              <TableHead className="text-primary-foreground font-semibold">Details</TableHead>
              <TableHead className="text-primary-foreground font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{log.userName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2">
                        <div className="flex-grow min-w-0">
                            <RenderDetails details={log.details} />
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View full details</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Audit Log Details</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4 border-b mb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground">Action</p>
                                        <p className="text-base font-medium capitalize">{log.action.replace(/\./g, ' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground">Timestamp</p>
                                        <p className="text-base font-medium">{new Date(log.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground">User</p>
                                        <p className="text-base font-medium">{log.userName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-muted-foreground">Status</p>
                                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="capitalize">
                                            {log.status}
                                        </Badge>
                                    </div>
                                </div>
                                <ScrollArea className="max-h-[400px] rounded-md border p-4 bg-muted/30">
                                    <div className="space-y-4">
                                        {Object.entries(log.details).map(([key, value]) => (
                                            <div key={key} className="space-y-1">
                                                <h4 className="text-sm font-bold capitalize text-primary">
                                                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                                </h4>
                                                <div className="text-sm bg-background p-3 rounded-md border shadow-sm">
                                                    {typeof value === 'object' && value !== null ? (
                                                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                                            {JSON.stringify(value, null, 2)}
                                                        </pre>
                                                    ) : (
                                                        <p className="break-words">{String(value)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(log.details).length === 0 && (
                                            <p className="text-center text-muted-foreground italic py-8">No additional details recorded for this action.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="capitalize">
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {paginatedLogs.length} of {sortedLogs.length} log(s) displayed.
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-[18px] w-[18px]" />
                Previous
            </Button>
            <span className="p-2 text-sm">Page {currentPage} of {totalPages}</span>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
            >
                Next
                <ChevronRight className="h-[18px] w-[18px]" />
            </Button>
        </div>
      </div>
    </div>
  );
}
