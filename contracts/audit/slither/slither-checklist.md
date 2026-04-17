'forge clean' running (wd: /work/contracts)
'forge' returned non-zero exit code 1
Error: "/work/contracts/out": Device or resource busy (os error 16)
'forge config --json' running
'forge build --build-info --skip ./test/** ./script/** --force' running (wd: /work/contracts)
'forge' returned non-zero exit code 1
Error: "/work/contracts/out": Device or resource busy (os error 16)
Traceback (most recent call last):
  File "/opt/slither-venv/bin/slither", line 6, in <module>
    sys.exit(main())
  File "/opt/slither-venv/lib/python3.10/site-packages/slither/__main__.py", line 776, in main
    main_impl(all_detector_classes=detectors, all_printer_classes=printers)
  File "/opt/slither-venv/lib/python3.10/site-packages/slither/__main__.py", line 882, in main_impl
    ) = process_all(filename, args, detector_classes, printer_classes)
  File "/opt/slither-venv/lib/python3.10/site-packages/slither/__main__.py", line 96, in process_all
    compilations = compile_all(target, **vars(args))
  File "/opt/slither-venv/lib/python3.10/site-packages/crytic_compile/crytic_compile.py", line 722, in compile_all
    compilations.append(CryticCompile(target, **kwargs))
  File "/opt/slither-venv/lib/python3.10/site-packages/crytic_compile/crytic_compile.py", line 211, in __init__
    self._compile(**kwargs)
  File "/opt/slither-venv/lib/python3.10/site-packages/crytic_compile/crytic_compile.py", line 633, in _compile
    self._platform.compile(self, **kwargs)
  File "/opt/slither-venv/lib/python3.10/site-packages/crytic_compile/platform/foundry.py", line 102, in compile
    hardhat_like_parsing(
  File "/opt/slither-venv/lib/python3.10/site-packages/crytic_compile/platform/hardhat.py", line 52, in hardhat_like_parsing
    raise InvalidCompilation(txt)
crytic_compile.platform.exceptions.InvalidCompilation: Compilation failed. Can you run build command?
/work/contracts/out/build-info is not a directory.
