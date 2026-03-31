// src/components/restaurant/ReservationForm.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, Clock } from "lucide-react";
import { LockCountdown } from "./LockCountdown";
import { useLockCountdown } from "@/hooks/useTableLocks";

const reservationSchema = z.object({
  party_size: z
    .number()
    .min(1, "Party size must be at least 1")
    .max(20, "Party size cannot exceed 20"),
  reservation_time: z.string().min(1, "Reservation time is required"),
  guest_name: z.string().min(2, "Guest name is required"),
  special_requests: z.string().optional().default(""),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  tableId: string;
  venueId: string;
  tableNumber: number;
  capacity: number;
  lockExpiresAt: Date;
  isLoading?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export const ReservationForm: React.FC<ReservationFormProps> = ({
  tableId,
  venueId,
  tableNumber,
  capacity,
  lockExpiresAt,
  isLoading = false,
  onSuccess,
  onError,
  onCancel,
}) => {
  const remaining = useLockCountdown(lockExpiresAt);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      party_size: 1,
      reservation_time: new Date().toISOString().slice(0, 16),
      guest_name: "",
      special_requests: "",
    },
  });

  useEffect(() => {
    if (remaining === 0) {
      onCancel?.();
    }
  }, [remaining, onCancel]);

  const onSubmit = async (data: ReservationFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_id: tableId,
          venue_id: venueId,
          party_size: data.party_size,
          reservation_time: data.reservation_time,
          guest_name: data.guest_name,
          special_requests: data.special_requests,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create reservation");
      }

      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
      <h2 className="text-2xl font-bold mb-1">Reserve Table {tableNumber}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Capacity: {capacity} guests
      </p>

      <div className="mb-6">
        <LockCountdown
          expiresAt={lockExpiresAt}
          remainingSeconds={remaining}
          compact={false}
        />
      </div>

      {remaining === 0 && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Lock Expired
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Your lock has expired. Please close this form and try again.
            </p>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="party_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Party Size</FormLabel>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange(Math.max(1, field.value - 1))}
                    disabled={field.value <= 1}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    {...field}
                    className="w-16 text-center"
                    readOnly
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange(Math.min(capacity, field.value + 1))}
                    disabled={field.value >= capacity}
                  >
                    +
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
                    Max: {capacity}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reservation_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reservation Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    disabled={remaining === 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="guest_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter guest name"
                    {...field}
                    disabled={remaining === 0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="special_requests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Requests (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special requests or dietary restrictions?"
                    {...field}
                    disabled={remaining === 0}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isSubmitting || remaining === 0}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || remaining === 0}
            >
              {isSubmitting ? (
                "Creating..."
              ) : (
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  Confirm Reservation
                </div>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ReservationForm;
