# Testing Plan for Phases 1-4

## Dev Server Status
✓ Running at http://localhost:5173

---

## Phase 1: Enhanced Dashboard (5-card Grid)
**Implemented Components:**
- FinHealthCheck: Budget + insights panel (over/under budget, biggest category, bills due <48h)
- InfluenceCards: "Best day to spend", "Biggest expense" guidance
- FavoritesCard: Quick access to top 3-5 categories by frequency
- QuickFilterBar: Smart filtering under PageTitle

**Test Cases:**

### ☐ Dashboard Load
**Expected:**
- Page loads in < 3 seconds
- Title: "PaisaWise — Track every paisa wisely"
- Subtitle: "Check your money at a glance."
- Functional navigation to all pages

**Steps:**
1. Open http://localhost:5173
2. Verify page title and branding
3. Navigate to Dashboard

**Success Criteria:**
- ✅ Page renders cleanly
- ✅ Title and subtitle display correctly
- ✅ No console errors

### ☐ FinHealth Check Panel
**Expected:**
- Shows budget status (Over budget / On track)
- Displays actual used/remaining at glance
- Highlights biggest category spending
- Shows bills due in 48 hours with total amount
- Click "Get insight" navigates to Budgets page

**Steps:**
1. Navigate to Dashboard
2. Observe FinHealth panel at top
3. Check all insights displayed

**Success Criteria:**
- ✅ Panel shows correct budget percentage used
- ✅ Status badge changes color (orange/red based on status)
- ✅ Big category highlighted
- ✅ Bills due counter accurate

### ☐ Influence Cards
**Expected:**
- "Best day to spend" card: Informs about day with lowest spending
- "Biggest expense" card: Shows largest expense with value

**Steps:**
1. Scroll past FinHealth panel
2. Check InfluenceCard display
3. Verify content is personalized

**Success Criteria:**
- ✅ Cards show relevant advice
- ✅ Action buttons work (navigate to Calendar/Budgets)
- ✅ Hover effects visible

### ☐ Favorites Card
**Expected:**
- Shows top 3-5 most-used categories
- Interactive buttons with category colors
- Displays count of expenses per category
- Tapping navigates to Expenses page filtered by category

**Steps:**
1. Find Favorites section on Dashboard
2. Check category list
3. Tap any category item

**Success Criteria:**
- ✅ Categories ordered by frequency
- ✅ Color indicators match category colors
- ✅ Tapping filters expense list

### ☐ Due Today Section
**Expected:**
- Shows 2-5 most recent overdue/due today items
- Each row shows title, amount, category, due date
- "View all" button navigates to Due page

**Steps:**
1. Scroll to Due section
2. Check items display
3. Click "View all" → Navigate to DuePage

**Success Criteria:**
- ✅ Items show correct expense data
- ✅ Navigate action works
- ✅ No items shown when none due

### ☐ Quick Filter Bar
**Expected:**
- Shows filter chips: Overview, Due today, Upcoming, Budget, Favorites
- Active filter highlights (primary color)
- Clicking filters shows/hides dashboard sections

**Steps:**
1. Locate QuickFilterBar under PageTitle
2. Click each filter chip
3. Note active state

**Success Criteria:**
- ✅ All filters display
- ✅ Active filter clearly highlighted
- ✅ Clicking changes UI

### ☐ "Add expense" button
**Expected:**
- Visible on Dashboard
- Opens ExpenseModal
- Navigates correctly

**Steps:**
1. Locate "＋ Add expense" button
2. Click to open modal
3. Verify modal appears

**Success Criteria:**
- ✅ Modal opens smoothly
- ✅ Placeholder text visible

---

## Phase 2: Batch Payment Collection (DuePage)
**Implemented Components:**
- Progress indicator: "Bills due: X (Y paid, Z pending)"
- "Pay all due today" with budget safety net
- Conflict detection for same-day + same-day+48h bills
- Budget guidance card with 4 types (success, warning, danger, info)
- Visual warnings on over-budget items
- Quick filter sample (in testing)

**Test Cases:**

### ☐ DuePage Load
**Expected:**
- Displays "Due today" as workspace section
- Shows date badge (Day Month format)
- Lists expenses due today
- Shows total due amount
- Progress bar if bills exist
- Budget guidance visible if expenses

**Steps:**
1. Navigate to /due
2. Check page structure
3. Verify banner displays

**Success Criteria:**
- ✅ Page loads cleanly
- ✅ Date badge accurate
- ✅ Banner shows correct totals
- ✅ Expenses list populates

### ☐ Expense List
**Expected:**
- Each expense shows title, amount, category, due date
- Checkbox to select
- Row hover effect
- Budget warning badge if expense exceeds remaining budget

**Steps:**
1. Check each expense row
2. Click checkbox
3. Observe hover states
4. Check if any show budget warning

**Success Criteria:**
- ✅ Display accurate expense data
- ✅ Selection toggles checkbox
- ✅ Hover effect present (background change)
- ✅ Budget warning appears if applicable

### ☐ Budget Guidance Card
**Expected:**
- Shows at top of due list (if expenses exist)
- 4 color-coded types:
  - Success: Can pay all with remaining
  - Warning: Would exceed budget by X
  - Danger: No budget left
  - Info: Budget remaining for bills
- Shows guidance icon, message, optional "Pay" button
- Tap actions work

**Steps:**
1. Check guidance card type based on budget
2. Verify message accuracy
3. Test "Pay" button if available

**Success Criteria:**
- ✅ Color matches budget status
- ✅ Message aligns with actual remaining budget
- ✅ Button only shows when applicable
- ✅ Tap action works

### ☐ Batch Payment with Budget Safety
**Expected:**
- "Pay selected / Pay all selected" button available when items selected
- Button disabled if no selection
- Budget check confirms before payment
- Progress indicator shows while processing

**Steps:**
1. Select 2-3 expenses
2. Click "Pay selected"
3. Check budget warnings intelligently

**Success Criteria:**
- ✅ Button appears when items selected
- ✅ Button disabled when no items
- ✅ Existing budget safety (from commit message) remains

### ☐ Progress Indicator
**Expected:**
- Shows when bills exist
- Displays: "X paid, Y pending"
- Progress bar visual
- Total count at bottom

**Steps:**
1. Check if progress bar appears
2. Verify counts match Y data
3. Check visual proportion

**Success Criteria:**
- ✅ Counts accurate
- ✅ Bar visual proportional
- ✅ Clears when no bills due

### ☐ "Select all" Function
**Expected:**
- Toggle at top of list
- Selects all visible items
- Updates summary
- Unchecks all if all selected

**Steps:**
1. Click "Select all" checkbox
2. Check item selections
3. Click again

**Success Criteria:**
- ✅ All items toggle correctly
- ✅ Summary updates instantly
- ✅ Visual indicates selection state

---

## Phase 3: Expense Entry Consistency (ExpenseModal)
**Implemented Components:**
- Minimal-first form: Title, Amount, Category, Notes (4 fields)
- Expandable detail sections: Payment, Status, Dates, Recurring
- Collapsible toggle button
- Mobile FAB: 56px visual, subtitle "Add expense", expanded content breathing room
- Split payments: Multi-payer tracking

**Test Cases:**

### ☐ Mobile FAB
**Expected:**
- Fixed position, bottom-right (right: 20px, bottom: calc(82px + safe-area))
- Visual size: 56px diameter
- Border-radius: 14px (rounded corners, not circle)
- Floating label: "Add expense"
- Teal background (#0d7377)
- Shadow for visibility
- Active state: Scale 0.95 on press

**Steps:**
1. Open Dashboard
2. Scroll to bottom of screen
3. Locate FAB in bottom-right
4. Check visual attributes
5. Test tap/click

**Success Criteria:**
- ✅ Positioned in bottom-right
- ✅ Visual size 56px
- ✅ Round-small corners (14px)
- ✅ Label "Add expense" visible
- ✅ Teal background
- ✅ Tap opens modal (after Phase 4 Un戒'll test)

### ☐ Minimal Expense Form (Mobile/Desktop)
**Expected:**
- Default state: 4 visible fields (Title, Amount, Category, Notes)
- "… More fields" button in modal actions
- Any minimal field click collapses detail sections
- Clean, focused design

**Steps:**
1. Open ExpenseModal
2. Check displayed fields
3. Verify "More fields" button exists
4. Click minimal field → Verify no expansion

**Success Criteria:**
- ✅ Only 4 fields visible by default
- ✅ "More fields" button present
- ✅ Minimal fields are the targeted essentials
- ✅ Expandable sections hidden

### ☐ Expandable Detail Sections
**Expected:**
- Click "… More fields" → Reveals sections:
  - Payment method (Card, Cash, UPI, Bank)
  - Status (Pending, Paid, Due Today, Upcoming, Overdue)
  - Date input
  - Due date input
  - Recurring checkbox
  - Split payments section
- Smooth expand/collapse animation
- "✓ Save" button appears when expanded

**Steps:**
1. Click "… More fields"
2. Verify sections appear
3. Click "✓ Save"
4. Verify form submission

**Success Criteria:**
- ✅ All sections visible
- ✅ Animation smooth
- ✅ Save button appears
- ✅ No console errors

### ☐ Split Payments
**Expected:**
- Toggle: "Split this expense" checkbox
- If enabled: Shows "Add each payer's share"
- Each payer row: Name input + Amount input + Remove button
- "Add payer" button below list
- Multi-row support

**Steps:**
1. Check if split toggle visible
2. Check "Split this expense" checkbox
3. Fill in payer name + amount
4. Add second payer
5. Remove first payer
6. Verify total calculations

**Success Criteria:**
- ✅ Toggle appears in detail section
- ✅ Enabling shows payer rows
- ✅ Add/remove payer buttons work
- ✅ No errors

### ☐ Form Validation
**Expected:**
- Title: Required, cannot be empty
- Amount: Required, > 0
- Due date: Required
- Notes: Optional
- Error messages show as red text under fields

**Steps:**
1. Try submitting empty form
2. Check error messages

**Success Criteria:**
- ✅ Validation works
- ✅ Error messages clear
- ✅ Cannot submit with errors

### ☐ Responsive Design
**Expected:**
- Modal width: min(540px, 100%) across all breakpoints
- Form grid adapts (2 columns → 1 column on small screens)
- Mobile FAB visible only on screens < 720px

**Steps:**
1. Open modal on both mobile and desktop viewports
2. Check grid layout

**Success Criteria:**
- ✅ Modal fits all screens
- ✅ Grid adapts appropriately
- ✅ No horizontal scrolling

---

## Phase 4: Budget Intelligence with Warnings
**Implemented Components:**
- Warning banner: 60%, 70%, 80% thresholds
- One-time acknowledgment system
- Warning persists until dismissed
- Dynamic remaining amount display

**Test Cases:**

### ☐ Warning Banner Trigger
**Expected:**
- Bu page loads, calculates budget usage %
- If percent >= 60% and < 70%: Show 70% warning
- If percent >= 70% and < 80%: Show 80% warning
- If percent >= 80%: Show immediate 80%+ warning
- Hidden if budget not set or percent < 60%

**Steps:**
1. Navigate to Budgets page
2. Check if budget is set
3. Adjust monthly budget (edit to known value)
4. Add dummy expenses to reach target %
5. Refresh page → Verify warning triggers

**Success Criteria:**
- ✅ Warning appears at correct thresholds
- ✅ Remaining amount accurate
- ✅ Message clear and actionable

### ☐ Warning Acknowledgment
**Expected:**
- Warning banner tap → Dismisses banner
- "Acknowledged budget warnings" button appears below budget inputs
- Component renders "resolved"
- Warning does not reappear until budget changes significantly
- Banner fully hidden after dismissal

**Steps:**
1. Tap warning banner
2. Check for acknowledge button
3. Tap acknowledge button
4. Reload page
5. Verify warning does NOT reappear

**Success Criteria:**
- ✅ Tap dismisses banner visibly
- ✅ Acknowledge button appears
- ✅ Warning acknowledges cleanly
- ✅ Warning stays dismissed

### ☐ Budget Progress Indicator (On-Page)
**Expected:**
- Status badge in budget settings header
- Dynamic based on spend vs limit:
  - monthSpend >= budgets.monthly: "Over budget" (red)
  - monthSpend < budgets.monthly: "On track" (green)
  - budgets.monthly = 0: "No limit"

**Steps:**
1. Open Budgets page
2. Check status badge display
3. Add expense to push over budget
4. Refresh → Check status changes to red

**Success Criteria:**
- ✅ Color matches budget status
- ✅ Text aligned with actual status
- ✅ Real-time updates after edits

### ☐ Budget Input Displays
**Expected:**
- Daily/weekly/monthly budget inputs
- Edit mode available when budgetsLoaded
- Values persist after changes
- Hint showing remaining budget (if applicable)

**Steps:**
1. Edit daily budget
2. Verify value updates
3. Save budget limits
4. Check remaining displayed

**Success Criteria:**
- ✅ Editable inputs work
- ✅ Values save correctly
- ✅ No memory leaks/errors

---

## Phase 5: Calendar 4-week View (Next Phase)
**Not Yet Implemented:**
- 2-week/month toggle
- 64-hour buffer (15 days before + 15 days after)
- Category color bars on events
- Quick-tap actions (view, edit, delete)

**Test Cases:**
None yet - requiring implementation.

---

## Test Execution Plan

### Phase 1: Dashboard (Highest Priority)
- [ ] Run all Dashboard test cases
- [ ] Document any visual deficits or issues
- [ ] Confirm interactivity

### Phase 2: DuePage (High Priority)
- [ ] Run all DuePage test cases
- [ ] Test batch payment flow
- [ ] Verify budget safety integration

### Phase 3: ExpenseModal (Medium Priority)
- [ ] Run all ExpenseModal test cases
- [ ] Test minimal-first flow
- [ ] Verify expand/collapse

### Phase 4: Budget Warnings (Medium Priority)
- [ ] Run all Budget warning test cases
- [ ] Test different budget percentages
- [ ] Verify warning acknowledgment

### Cross-Phase Testing
- [ ] Navigate between all pages
- [ ] Test modal to dashboard flow
- [ ] Verify FAB to ExpenseModal flow
- [ ] Test complete user journey

---

## Known Limitations for Testing

1. **Missing Simulated Data**: Cannot test all scenarios without realistic expense data
2. **Real Budget**: Budget values unknown - may need to edit to test warnings
3. **Integration**: Some features may require Backend API connectivity
4. **Touch Targets**: Cannot test mobile touch simulation without device
5. **Suggested Budget**: AI functions exist but UI simplified (Phase 4 limited implementation)

---

## Next Steps

After testing:
1. Document all failures/sextations
2. Fix any bugs found
3. Move to Phase 5: Calendar 4-week View
4. Complete remaining phases

---

## Test Results Summary

**Phase 1 (Dashboard):**
- [WAITING] User should test after dev server loads
- [ ] All components functional?

**Phase 2 (DuePage):**
- [WAITING] User should test after dev server loads
- [ ] Batch payment flow works?

**Phase 3 (ExpenseModal):**
- [WAITING] User should test after dev server loads
- [ ] Minimal-first + expandable works?

**Phase 4 (Budget Warnings):**
- [WAITING] User should test after dev server loads
- [ ] Warning banner triggers correctly?

---

*Document created: 2026-10-16*
*Generated by: Claude Code*