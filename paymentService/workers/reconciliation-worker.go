package workers

import (
	"goPayment/pkg/logger"
	"goPayment/services"
	"time"
)

type ReconciliationWorker struct {
	paymentService services.PaymentService
}

func NewReconciliationWorker(paymentService services.PaymentService) *ReconciliationWorker {
	return &ReconciliationWorker{paymentService: paymentService}
}

func (w *ReconciliationWorker) Start() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			//fetches payments with stale status(actually refunded but status=refunding as db blip/crash ) and logs them for manual reconciliation(razerpay dashboard manual)
			stale, err := w.paymentService.FetchPaymentsWithStaleStatus()
			if err != nil {
				logger.Log.Error("Reconciliation query failed", "error", err)
				continue
			}
			for _, p := range stale {
				if p.Status != "CREATED" {
					logger.Log.Error("Payment needs manual reconcilation", "paymentId", p.Id, "status", p.Status)
					continue
				}
				if err := w.paymentService.ReconcileWithRazorpay(p); err != nil {
					logger.Log.Error("Auto-reconciliation failed, needs manual review",
						"paymentId", p.Id, "razorpayOrderId", p.RazorpayOrderId, "error", err)
				}
			}
		}
	}()
	logger.Log.Info("Reconciliation worker started")
}