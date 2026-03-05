<?php

namespace Smlv\Sdk\Laravel;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Smlv\Sdk\SmlvBalanceChecker;
use Smlv\Sdk\Exceptions\SmlvException;

/**
 * SMLV Balance Middleware for Laravel
 * 
 * Usage:
 * 
 * 1. Register in app/Http/Kernel.php:
 *    protected $routeMiddleware = [
 *        'smlv.balance' => \Smlv\Sdk\Laravel\SmlvBalanceMiddleware::class,
 *    ];
 * 
 * 2. Apply to routes:
 *    Route::post('/posts', [PostController::class, 'store'])
 *        ->middleware('smlv.balance:0.0,smlv_account_reference');
 *    
 *    Route::group(['middleware' => 'smlv.balance:0.0,smlv_account_reference'], function () {
 *        Route::post('/posts', [PostController::class, 'store']);
 *        Route::put('/posts/{id}', [PostController::class, 'update']);
 *    });
 */
class SmlvBalanceMiddleware
{
    /**
     * @var SmlvBalanceChecker
     */
    protected $balanceChecker;

    /**
     * @param SmlvBalanceChecker $balanceChecker
     */
    public function __construct(SmlvBalanceChecker $balanceChecker)
    {
        $this->balanceChecker = $balanceChecker;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  float  $minBalance Minimum required balance (default: 0.0)
     * @param  string  $accountField User model field containing account reference (default: 'smlv_account_reference')
     * @return mixed
     */
    public function handle(Request $request, Closure $next, $minBalance = '0.0', $accountField = 'smlv_account_reference')
    {
        // Check authentication
        if (!Auth::check()) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'You must be logged in to access this resource.',
            ], 401);
        }

        $user = Auth::user();
        $accountReference = $user->{$accountField} ?? null;

        if (empty($accountReference)) {
            return response()->json([
                'error' => 'No SMLV Account',
                'message' => 'SMLV account not found for this user.',
            ], 403);
        }

        try {
            $minBalance = (float) $minBalance;

            // Check if user can afford the action
            if (!$this->balanceChecker->canAfford($accountReference, $minBalance)) {
                $currentBalance = $this->balanceChecker->getBalance($accountReference);

                return response()->json([
                    'error' => 'Insufficient Balance',
                    'message' => 'You do not have sufficient balance to perform this action.',
                    'current_balance' => $currentBalance,
                    'required_balance' => $minBalance,
                ], 403);
            }
        } catch (SmlvException $e) {
            \Log::error("SMLV balance check failed: " . $e->getMessage());

            return response()->json([
                'error' => 'Balance Check Failed',
                'message' => 'Unable to verify balance. Please try again later.',
            ], 503);
        }

        return $next($request);
    }
}
