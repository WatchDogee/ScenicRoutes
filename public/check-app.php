<?php
// Script to check app directory
header('Content-Type: text/plain');

echo "App Directory Check\n";
echo "=================\n\n";

// Get current directory and parent directory
$currentDir = getcwd();
$parentDir = dirname($currentDir);

echo "Current directory: $currentDir\n";
echo "Parent directory: $parentDir\n\n";

// Check for app directory
$appPath = $parentDir . '/app';
echo "Checking app directory: $appPath\n";
if (is_dir($appPath)) {
    echo "App directory exists.\n";
    
    // List contents
    $appContents = scandir($appPath);
    echo "App directory contents: " . implode(', ', $appContents) . "\n\n";
    
    // Check for Http directory
    $httpPath = $appPath . '/Http';
    echo "Checking Http directory: $httpPath\n";
    if (is_dir($httpPath)) {
        echo "Http directory exists.\n";
        
        // List contents
        $httpContents = scandir($httpPath);
        echo "Http directory contents: " . implode(', ', $httpContents) . "\n\n";
        
        // Check for Kernel.php
        $kernelPath = $httpPath . '/Kernel.php';
        echo "Checking Kernel.php: $kernelPath\n";
        if (file_exists($kernelPath)) {
            echo "Kernel.php exists.\n";
            
            // Check content
            $kernelContent = file_get_contents($kernelPath);
            echo "Kernel.php content (first 20 lines):\n";
            $kernelLines = explode("\n", $kernelContent);
            for ($i = 0; $i < min(20, count($kernelLines)); $i++) {
                echo $kernelLines[$i] . "\n";
            }
        } else {
            echo "Kernel.php does not exist!\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelContent = <<<'EOL'
<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        // \App\Http\Middleware\TrustHosts::class,
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array<string, class-string|string>
     */
    protected $routeMiddleware = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    ];
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        }
    } else {
        echo "Http directory does not exist!\n";
        
        // Create Http directory
        echo "\nCreating Http directory...\n";
        if (mkdir($httpPath, 0777, true)) {
            echo "Http directory created successfully.\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelPath = $httpPath . '/Kernel.php';
            $kernelContent = <<<'EOL'
<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        // \App\Http\Middleware\TrustHosts::class,
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array<string, class-string|string>
     */
    protected $routeMiddleware = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    ];
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        } else {
            echo "Failed to create Http directory!\n";
        }
    }
    
    // Check for Console directory
    $consolePath = $appPath . '/Console';
    echo "\nChecking Console directory: $consolePath\n";
    if (is_dir($consolePath)) {
        echo "Console directory exists.\n";
        
        // List contents
        $consoleContents = scandir($consolePath);
        echo "Console directory contents: " . implode(', ', $consoleContents) . "\n\n";
        
        // Check for Kernel.php
        $kernelPath = $consolePath . '/Kernel.php';
        echo "Checking Kernel.php: $kernelPath\n";
        if (file_exists($kernelPath)) {
            echo "Kernel.php exists.\n";
            
            // Check content
            $kernelContent = file_get_contents($kernelPath);
            echo "Kernel.php content (first 20 lines):\n";
            $kernelLines = explode("\n", $kernelContent);
            for ($i = 0; $i < min(20, count($kernelLines)); $i++) {
                echo $kernelLines[$i] . "\n";
            }
        } else {
            echo "Kernel.php does not exist!\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelContent = <<<'EOL'
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        }
    } else {
        echo "Console directory does not exist!\n";
        
        // Create Console directory
        echo "\nCreating Console directory...\n";
        if (mkdir($consolePath, 0777, true)) {
            echo "Console directory created successfully.\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelPath = $consolePath . '/Kernel.php';
            $kernelContent = <<<'EOL'
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        } else {
            echo "Failed to create Console directory!\n";
        }
    }
    
    // Check for Exceptions directory
    $exceptionsPath = $appPath . '/Exceptions';
    echo "\nChecking Exceptions directory: $exceptionsPath\n";
    if (is_dir($exceptionsPath)) {
        echo "Exceptions directory exists.\n";
        
        // List contents
        $exceptionsContents = scandir($exceptionsPath);
        echo "Exceptions directory contents: " . implode(', ', $exceptionsContents) . "\n\n";
        
        // Check for Handler.php
        $handlerPath = $exceptionsPath . '/Handler.php';
        echo "Checking Handler.php: $handlerPath\n";
        if (file_exists($handlerPath)) {
            echo "Handler.php exists.\n";
            
            // Check content
            $handlerContent = file_get_contents($handlerPath);
            echo "Handler.php content (first 20 lines):\n";
            $handlerLines = explode("\n", $handlerContent);
            for ($i = 0; $i < min(20, count($handlerLines)); $i++) {
                echo $handlerLines[$i] . "\n";
            }
        } else {
            echo "Handler.php does not exist!\n";
            
            // Create Handler.php
            echo "\nCreating Handler.php...\n";
            $handlerContent = <<<'EOL'
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }
}
EOL;
            
            if (file_put_contents($handlerPath, $handlerContent)) {
                echo "Handler.php created successfully.\n";
            } else {
                echo "Failed to create Handler.php!\n";
            }
        }
    } else {
        echo "Exceptions directory does not exist!\n";
        
        // Create Exceptions directory
        echo "\nCreating Exceptions directory...\n";
        if (mkdir($exceptionsPath, 0777, true)) {
            echo "Exceptions directory created successfully.\n";
            
            // Create Handler.php
            echo "\nCreating Handler.php...\n";
            $handlerPath = $exceptionsPath . '/Handler.php';
            $handlerContent = <<<'EOL'
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }
}
EOL;
            
            if (file_put_contents($handlerPath, $handlerContent)) {
                echo "Handler.php created successfully.\n";
            } else {
                echo "Failed to create Handler.php!\n";
            }
        } else {
            echo "Failed to create Exceptions directory!\n";
        }
    }
} else {
    echo "App directory does not exist!\n";
    
    // Create app directory
    echo "\nCreating app directory...\n";
    if (mkdir($appPath, 0777, true)) {
        echo "App directory created successfully.\n";
        
        // Create Http directory
        echo "\nCreating Http directory...\n";
        $httpPath = $appPath . '/Http';
        if (mkdir($httpPath, 0777, true)) {
            echo "Http directory created successfully.\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelPath = $httpPath . '/Kernel.php';
            $kernelContent = <<<'EOL'
<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        // \App\Http\Middleware\TrustHosts::class,
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array<string, class-string|string>
     */
    protected $routeMiddleware = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    ];
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        } else {
            echo "Failed to create Http directory!\n";
        }
        
        // Create Console directory
        echo "\nCreating Console directory...\n";
        $consolePath = $appPath . '/Console';
        if (mkdir($consolePath, 0777, true)) {
            echo "Console directory created successfully.\n";
            
            // Create Kernel.php
            echo "\nCreating Kernel.php...\n";
            $kernelPath = $consolePath . '/Kernel.php';
            $kernelContent = <<<'EOL'
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
EOL;
            
            if (file_put_contents($kernelPath, $kernelContent)) {
                echo "Kernel.php created successfully.\n";
            } else {
                echo "Failed to create Kernel.php!\n";
            }
        } else {
            echo "Failed to create Console directory!\n";
        }
        
        // Create Exceptions directory
        echo "\nCreating Exceptions directory...\n";
        $exceptionsPath = $appPath . '/Exceptions';
        if (mkdir($exceptionsPath, 0777, true)) {
            echo "Exceptions directory created successfully.\n";
            
            // Create Handler.php
            echo "\nCreating Handler.php...\n";
            $handlerPath = $exceptionsPath . '/Handler.php';
            $handlerContent = <<<'EOL'
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }
}
EOL;
            
            if (file_put_contents($handlerPath, $handlerContent)) {
                echo "Handler.php created successfully.\n";
            } else {
                echo "Failed to create Handler.php!\n";
            }
        } else {
            echo "Failed to create Exceptions directory!\n";
        }
    } else {
        echo "Failed to create app directory!\n";
    }
}

echo "\nCheck completed at " . date('Y-m-d H:i:s') . "\n";
