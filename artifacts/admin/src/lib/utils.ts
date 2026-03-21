import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | undefined | null) {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy • h:mm a");
  } catch (e) {
    return dateString;
  }
}

export function formatCurrency(amount: string | number | undefined | null) {
  if (amount === undefined || amount === null) return "₹0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(num);
}

// Helper to inject the admin token into orval generated hook requests
export function useAuthHeaders() {
  const token = localStorage.getItem("admin_token");
  return {
    request: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  };
}
