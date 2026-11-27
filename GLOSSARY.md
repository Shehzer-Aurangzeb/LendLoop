# LendLoop

A neighbourhood board where people lend and borrow tools for whole days.

## People

**Lender**:
The user who listed a tool; owns it and decides on requests for it.
_Avoid_: Owner (in UI copy), seller

**Borrower**:
The user who asks to use someone else's tool for a date range.
_Avoid_: Renter, requester

**Admin**:
A user with the admin role, who can remove any listing, see every loan and mark Trusted Lenders.
_Avoid_: Moderator, superuser

**Visitor**:
Someone using LendLoop without signing in. Sees only tool names and categories.
_Avoid_: Guest, anonymous user

**Trusted Lender**:
A lender an admin has vouched for; shown as a badge.
_Avoid_: Verified user

## Things

**Tool**:
An item a lender has listed, with a category and a condition.
_Avoid_: Item, product, listing (as the data name)

**Category**:
One of a fixed set of tool kinds: power tools, hand tools, garden, kitchen, camping, other.

**Condition**:
One of like new, good or worn.

## Loans

**Loan**:
One borrower's use of one tool for an inclusive range of whole days, from the first request to the end.
_Avoid_: Booking, rental, reservation

**Request**:
A loan in the requested status, waiting for the lender.

**Loan status**:
Requested, approved, declined, returned or cancelled. Cancelled happens when the borrower withdraws a request before the lender decides, or when an admin removes the tool before the loan starts.

**Removed tool**:
A tool its lender or an admin has taken off the board. It stays on record so past loans still make sense.
_Avoid_: Deleted tool

**Loan activity**:
A record of an automated message about a loan: a request notification or an overdue reminder, and whether it was sent.
_Avoid_: Audit log, history

**Lent out**:
A tool with an approved loan that has started and is not yet returned, overdue or not. Any other tool on the board is available.
_Avoid_: Booked, unavailable

**Overdue loan**:
An approved loan whose end date is before today, in the app's one timezone. Worked out on read, never stored.
_Avoid_: Late loan
