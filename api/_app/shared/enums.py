from enum import Enum


class PaymentStatus(str, Enum):
    NOT_PAID = "NotPaid"
    PAID = "Paid"
    FAILED = "Failed"
