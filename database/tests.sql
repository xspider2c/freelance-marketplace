-- هر تست در یک بلوک DO اجرا می‌شود؛ انتظار: خطا → "PASS"
-- (پس از schema.sql و seed.sql اجرا شود)
DO $$ BEGIN
  -- T1 ایمیل تکراری
  BEGIN INSERT INTO users(first_name,last_name,email,password_hash) VALUES('X','Y','ali@fm.test','$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    RAISE NOTICE 'T1 FAIL'; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'T1 PASS (duplicate email rejected)'; END;
  -- T2 کلید خارجی نامعتبر
  BEGIN INSERT INTO projects(employer_id,title,description,pricing_type,budget) VALUES(999,'t','d','fixed_price',100);
    RAISE NOTICE 'T2 FAIL'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'T2 PASS (invalid FK rejected)'; END;
  -- T3 پیشنهاد تکراری (Ali قبلا برای پروژه 3 داده)
  BEGIN INSERT INTO proposals(project_id,freelancer_id,amount,cover_letter) VALUES(3,2,400000,'dup');
    RAISE NOTICE 'T3 FAIL'; EXCEPTION WHEN unique_violation THEN RAISE NOTICE 'T3 PASS (duplicate proposal rejected)'; END;
  -- T4 بودجه صفر / منفی
  BEGIN INSERT INTO projects(employer_id,title,description,pricing_type,budget) VALUES(2,'t','d','hourly',0);
    RAISE NOTICE 'T4 FAIL'; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'T4 PASS (budget=0 rejected)'; END;
  BEGIN INSERT INTO proposals(project_id,freelancer_id,amount,cover_letter) VALUES(2,4,-5,'neg');
    RAISE NOTICE 'T4b FAIL'; EXCEPTION WHEN check_violation THEN RAISE NOTICE 'T4b PASS (negative amount rejected)'; END;
  -- T5 پذیرش بیش از یک پیشنهاد در یک پروژه (پروژه 3 → ابتدا یکی را بپذیر، دومی باید رد شود)
  UPDATE proposals SET status='accepted' WHERE id = 2;
  BEGIN UPDATE proposals SET status='accepted' WHERE id = 3;
    RAISE NOTICE 'T5 FAIL'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'T5 PASS (second accept rejected: %)', SQLERRM; END;
  -- T6 پیشنهاد روی پروژه خود
  BEGIN INSERT INTO proposals(project_id,freelancer_id,amount,cover_letter) VALUES(2,3,1,'self');
    RAISE NOTICE 'T6 FAIL'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'T6 PASS (self-proposal rejected: %)', SQLERRM; END;
  -- T7 ادمین پروژه ثبت کند
  BEGIN INSERT INTO projects(employer_id,title,description,pricing_type,budget) VALUES(1,'t','d','fixed_price',100);
    RAISE NOTICE 'T7 FAIL'; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'T7 PASS (admin cannot create project)'; END;
  -- T8 حذف کاربر دارای پروژه
  BEGIN DELETE FROM users WHERE id = 2;
    RAISE NOTICE 'T8 FAIL'; EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE 'T8 PASS (delete restricted)'; END;
END $$;
