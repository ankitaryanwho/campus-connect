import { useState } from "react";
import { useAdminListTransactions } from "@workspace/api-client-react";
import { useAuthHeaders, formatCurrency, formatDate } from "@/lib/utils";
import { Card, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Select, Badge, PageLoader, Button } from "@/components/ui/core";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

export default function TransactionsPage() {
  const req = useAuthHeaders();
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useAdminListTransactions({ type, page, pageSize }, { ...req });

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Transactions</h1>
          <p className="text-muted-foreground">Monitor platform wallet activity and cash flow.</p>
        </div>
        <Card className="glass-panel px-6 py-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Volume</p>
            <p className="text-xl font-bold text-white">{formatCurrency(data?.totalVolume)}</p>
          </div>
        </Card>
      </div>

      <Card className="glass-panel overflow-hidden">
        <div className="p-4 flex gap-4 bg-black/20 border-b border-white/5">
          <Select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="w-48">
            <option value="">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="payment">Payments</option>
            <option value="transfer">Transfers</option>
          </Select>
        </div>
        
        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items?.map((tx: any) => {
                  const isPositive = ['deposit', 'refund'].includes(tx.type) || (tx.amount && parseFloat(tx.amount) > 0);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isPositive ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                          <span className="capitalize text-white/80">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{tx.userName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{tx.description}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${isPositive ? 'text-emerald-400' : 'text-white'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm bg-black/20">
              <span className="text-muted-foreground">
                Showing page {page} of {Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
              </span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p=>p+1)} disabled={!data?.items?.length || data.items.length < pageSize}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
